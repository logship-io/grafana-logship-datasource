package models

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"strconv"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	jsoniter "github.com/json-iterator/go"
)

type TableResponse struct {
	Headers []string `json:"Headers"`
	Columns []struct {
		Name string `json:"Name"`
		Type string `json:"Type"`
	} `json:"Columns"`
	Results []map[string]interface{} `json:"Results"`
}

// func (ar *TableResponse) getTableByName(name string) (TableResponse, error) {
// 	for _, t := range *ar {
// 		if t.Name == name {
// 			return t, nil
// 		}
// 	}
// 	return Tabl, fmt.Errorf("no data as %v table is missing from the the response", name)
// }

func (tr *TableResponse) ToDataFrames(executedQueryString string) (data.Frames, error) {
	// table, err := tr.getTableByName("Table_0")

	converterFrame, err := converterFrameForTable(*tr, executedQueryString)
	if err != nil {
		return nil, err
	}

	return data.Frames{converterFrame.Frame}, nil
}

func converterFrameForTable(t TableResponse, executedQueryString string) (*data.FrameInputConverter, error) {
	converters := make([]data.FieldConverter, len(t.Columns))
	colNames := make([]string, len(t.Columns))
	colTypes := make([]string, len(t.Columns))

	for i, col := range t.Columns {
		colNames[i] = col.Name
		colTypes[i] = col.Type
		converter, ok := converterMap[col.Type]
		if !ok {
			return nil, fmt.Errorf("unsupported analytics column type %v", col.Type)
		}
		converters[i] = converter
	}

	fic, err := data.NewFrameInputConverter(converters, len(t.Results))
	if err != nil {
		return nil, err
	}

	err = fic.Frame.SetFieldNames(colNames...)
	if err != nil {
		return nil, err
	}

	fic.Frame.Meta = &data.FrameMeta{
		ExecutedQueryString: executedQueryString,
		Custom:              LogshipFrameMD{ColumnTypes: colTypes},
	}

	for row_index, row := range t.Results {
		for f_index, fname := range colNames {
			fic.Set(f_index, row_index, row[fname])
		}
	}

	return fic, nil
}

var converterMap = map[string]data.FieldConverter{
	"String":   stringConverter,
	"Guid":     stringConverter,
	"TimeSpan": stringConverter,
	"Dynamic":  dynamicConverter,
	"DateTime": timeConverter,
	"Int32":    intConverter,
	"UInt32":   intConverter,
	"Int64":    longConverter,
	"UInt64":   longConverter,
	"real":     realConverter,
	"Float32":  realConverter,
	"Float64":  realConverter,
	"Boolean":  boolConverter,
	"Decimal":  decimalConverter,
}

var dynamicConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeString,
	Converter: func(v interface{}) (interface{}, error) {
		b, err := jsoniter.Marshal(v)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal dynamic type into JSON string '%v': %v", v, err)
		}
		return string(b), nil
	},
}

var stringConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableString,
	Converter: func(v interface{}) (interface{}, error) {
		var as *string
		if v == nil {
			return as, nil
		}
		s, ok := v.(string)
		if !ok {
			return nil, fmt.Errorf("unexpected type, expected string but got type %T with a value of %v", v, v)
		}
		as = &s
		return as, nil
	},
}

var timeConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableTime,
	Converter: func(v interface{}) (interface{}, error) {
		var at *time.Time
		if v == nil {
			return at, nil
		}
		s, ok := v.(string)
		if !ok {
			return nil, fmt.Errorf("unexpected type, expected string but got type %T with a value of %v", v, v)
		}
		t, err := time.Parse(time.RFC3339Nano, s)
		if err != nil {
			return nil, err
		}

		return &t, nil
	},
}

var realConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableFloat64,
	Converter: func(v interface{}) (interface{}, error) {
		var af *float64
		if v == nil {
			return af, nil
		}
		jN, ok := v.(json.Number)
		if !ok {
			s, sOk := v.(string)
			if sOk {
				switch s {
				case "Infinity":
					f := math.Inf(0)
					return &f, nil
				case "-Infinity":
					f := math.Inf(-1)
					return &f, nil
				case "NaN":
					f := math.NaN()
					return &f, nil
				}
			}
			return nil, fmt.Errorf("unexpected type, expected json.Number but got type %T for value %v", v, v)
		}
		f, err := jN.Float64()
		if err != nil {
			return nil, err
		}
		return &f, err
	},
}

var boolConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableBool,
	Converter: func(v interface{}) (interface{}, error) {
		var ab *bool
		if v == nil {
			return ab, nil
		}
		b, ok := v.(bool)
		if !ok {
			return nil, fmt.Errorf("unexpected type, expected bool but got got type %T with a value of %v", v, v)
		}
		return &b, nil
	},
}

var intConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableInt32,
	Converter: func(v interface{}) (interface{}, error) {
		var ai *int32
		if v == nil {
			return ai, nil
		}
		jN, ok := v.(json.Number)
		if !ok {
			return nil, fmt.Errorf("unexpected type, expected json.Number but got type %T with a value of %v", v, v)
		}
		var err error
		iv, err := strconv.ParseInt(jN.String(), 10, 32)
		if err != nil {
			return nil, err
		}
		aInt := int32(iv)
		return &aInt, nil
	},
}

var longConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableInt64,
	Converter: func(v interface{}) (interface{}, error) {
		var ai *int64
		if v == nil {
			return ai, nil
		}
		jN, ok := v.(json.Number)
		if !ok {
			return nil, fmt.Errorf("unexpected type, expected json.Number but got type %T with a value of %v", v, v)
		}
		out, err := jN.Int64()
		if err != nil {
			return nil, err
		}
		return &out, err
	},
}

var decimalConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeNullableFloat64,
	Converter: func(v interface{}) (interface{}, error) {
		var af *float64
		if v == nil {
			return af, nil
		}

		jS, sOk := v.(string)
		if sOk {
			out, err := strconv.ParseFloat(jS, 64)
			if err != nil {
				return nil, err
			}
			return &out, err
		}

		jN, nOk := v.(json.Number)
		if !nOk {
			return nil, fmt.Errorf("unexpected type, expected json.Number or string but got type %T with a value of %v", v, v)
		}
		out, err := jN.Float64()
		if err != nil {
			return nil, err
		}
		return &out, nil
	},
}

// ToLogshipTimeSeries returns Time series for a query that returns an Logship series type.
// This done by having a query with make_series as the returned type.
// The time column must be named "Timestamp".
// Each Row has:
// - N Columns for group by items, where each Group by item is a column individual string column
// - An Array of Values per Aggregation Column
// - Timestamp column
//
// From the Logship documentation, I believe all series will share the same time index,
// so we create a wide frame.
func ToLogshipTimeSeries(in *data.Frame) (*data.Frame, error) {
	if in.Rows() == 0 {
		return in, nil
	}

	timeColIdx := -1
	labelColIdxs := []int{}
	valueColIdxs := []int{}

	// TODO check to avoid panics
	getKustoColType := func(fIdx int) string {
		return in.Meta.Custom.(LogshipFrameMD).ColumnTypes[fIdx]
	}

	foundTime := false
	for fieldIdx, field := range in.Fields {
		switch getKustoColType(fieldIdx) {
		case "string":
			labelColIdxs = append(labelColIdxs, fieldIdx)
		case "dynamic":
			if field.Name == "timestamp" {
				if foundTime {
					return nil, fmt.Errorf("must be exactly one column named 'timestamp', but response has more than one")
				}
				foundTime = true
				timeColIdx = fieldIdx
				continue
			}
			valueColIdxs = append(valueColIdxs, fieldIdx)

		}
	}

	if timeColIdx == -1 {
		return nil, fmt.Errorf("response must have a column named 'timestamp'")
	}
	if len(valueColIdxs) < 1 {
		return nil, fmt.Errorf("did not find a numeric value column, expected at least one column of type 'dynamic', got %v", len(valueColIdxs))
	}

	out := data.NewFrame(in.Name).SetMeta(&data.FrameMeta{ExecutedQueryString: in.Meta.ExecutedQueryString})

	// Each row is a series
	expectedRowLen := 0
	for rowIdx := 0; rowIdx < in.Rows(); rowIdx++ {
		// Set up the shared time index
		if rowIdx == 0 {
			rawTimeArrayString := in.At(timeColIdx, 0).(string)
			times := []time.Time{}
			err := jsoniter.Unmarshal([]byte(rawTimeArrayString), &times)
			if err != nil {
				return nil, err
			}
			expectedRowLen = len(times)
			out.Fields = append(out.Fields, data.NewField("timestamp", nil, times))
		}

		// Build the labels for the series from the row
		var l data.Labels
		for i, labelIdx := range labelColIdxs {
			if i == 0 {
				l = make(data.Labels)
			}
			labelVal, _ := in.ConcreteAt(labelIdx, rowIdx)
			l[in.Fields[labelIdx].Name] = labelVal.(string)
		}

		for _, valueIdx := range valueColIdxs {
			// Will treat all numeric values as nullable floats here
			vals := []*float64{}
			rawValues := in.At(valueIdx, rowIdx).(string)
			err := jsoniter.Unmarshal([]byte(rawValues), &vals)
			if err != nil {
				return nil, err
			}
			if len(vals) == 0 {
				// When all the values are null, the object is null in the response.
				// Must set to length of frame for a consistent length frame
				vals = make([]*float64, expectedRowLen)
			}
			out.Fields = append(out.Fields, data.NewField(in.Fields[valueIdx].Name, l, vals))
		}

	}

	return out, nil
}

func TableFromJSON(rc io.Reader) (*TableResponse, error) {
	tr := &TableResponse{}
	decoder := jsoniter.NewDecoder(rc)
	// Numbers as string (json.Number) so we can keep types as best we can (since the response has 'type' of column)
	decoder.UseNumber()
	err := decoder.Decode(tr)
	if err != nil {
		return nil, err
	}
	if tr == nil || len(tr.Headers) == 0 {
		return nil, fmt.Errorf("unable to parse response, parsed response has no headers")
	}

	return tr, nil
}
