package azuredx

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// TableResponse represents the response struct from Azure's Data Explorer REST API.
type TableResponse struct {
	Tables []Table
}

// Table is a member of TableResponse
type Table struct {
	TableName string
	Columns   []Column
	Rows      []Row
}

// Row Represents a row within a TableResponse
type Row []interface{}

// Column is a descriptor within a TableResponse
type Column struct {
	ColumnName string
	DataType   string
	ColumnType string
}

func (ar *TableResponse) getTableByName(name string) (Table, error) {
	for _, t := range ar.Tables {
		if t.TableName == name {
			return t, nil
		}
	}
	return Table{}, fmt.Errorf("no data as %v table is missing from the the response", name)
}

func (tables *TableResponse) ToDataFrames(customMD map[string]interface{}) (data.Frames, error) {
	table, err := tables.getTableByName("Table_0")
	if err != nil {
		return nil, err
	}
	converterFrame, err := converterFrameForTable(table, customMD)
	if err != nil {
		return nil, err
	}
	for rowIdx, row := range table.Rows {
		for fieldIdx, field := range row {
			err = converterFrame.Set(fieldIdx, rowIdx, field)
			if err != nil {
				return nil, err
			}
		}
	}
	return data.Frames{converterFrame.Frame}, nil
}

func converterFrameForTable(t Table, customMD map[string]interface{}) (*data.FrameInputConverter, error) {
	converters := []data.FieldConverter{}
	colNames := make([]string, len(t.Columns))

	for i, col := range t.Columns {
		colNames[i] = col.ColumnName
		converter, ok := converterMap[col.ColumnType]
		if !ok {
			return nil, fmt.Errorf("unsupported analytics column type %v", col.ColumnType)
		}
		converters = append(converters, converter)
	}

	fic, err := data.NewFrameInputConverter(converters, len(t.Rows))
	if err != nil {
		return nil, err
	}

	err = fic.Frame.SetFieldNames(colNames...)
	if err != nil {
		return nil, err
	}
	if customMD != nil {
		fic.Frame.Meta = &data.FrameMeta{
			Custom: customMD,
		}
	}

	return fic, nil
}

var converterMap = map[string]data.FieldConverter{
	"string":   stringConverter,
	"guid":     stringConverter,
	"timespan": stringConverter,
	"dynamic":  dynamicConverter,
	"datetime": timeConverter,
	"int":      intConverter,
	"long":     longConverter,
	"real":     realConverter,
	"bool":     boolConverter,
}

var dynamicConverter = data.FieldConverter{
	OutputFieldType: data.FieldTypeString,
	Converter: func(v interface{}) (interface{}, error) {
		b, err := json.Marshal(v)
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

// ToADXTimeSeries returns Time series for a query that returns an ADX series type.
// This done by having a query with make_series as the returned type.
// The time column must be named "Timestamp".
// Each Row has:
// - N Columns for group by items, where each Group by item is a column individual string column
// - An Array of Values per Aggregation Column
// - Timestamp column
// func (tr *TableResponse) ToADXTimeSeries() ([]*datasource.TimeSeries, error) {
// 	seriesCollection := []*datasource.TimeSeries{}
// 	for _, resTable := range tr.Tables { // Foreach Table in Response
// 		if resTable.TableName != "Table_0" {
// 			continue
// 		}

// 		timeCount := 0
// 		timeColumnIdx := 0
// 		labelColumnIdxs := []int{} // idx to Label Name
// 		valueColumnIdxs := []int{}

// 		//TODO check len
// 		for colIdx, column := range resTable.Columns { // For column in the table
// 			switch column.ColumnType {
// 			case kustoTypeString, kustoTypeGUID:
// 				labelColumnIdxs = append(labelColumnIdxs, colIdx)
// 			case kustoTypeDynamic:
// 				if column.ColumnName == "Timestamp" {
// 					timeColumnIdx = colIdx
// 					timeCount++
// 					continue
// 				}
// 				valueColumnIdxs = append(valueColumnIdxs, colIdx)
// 			default:
// 				return nil, fmt.Errorf("unsupported type '%v' in response for a ADX time series query: must be dynamic, guid, or string", column.ColumnType)
// 			}
// 		}

// 		if timeCount != 1 {
// 			return nil, fmt.Errorf("query must contain exactly one datetime column named 'Timestamp', got %v", timeCount)
// 		}
// 		if len(valueColumnIdxs) < 1 {
// 			return nil, fmt.Errorf("did not find a value column, expected at least one column of type 'dynamic', got %v", len(valueColumnIdxs))
// 		}

// 		var times []int64
// 		for rowIdx, row := range resTable.Rows {
// 			if rowIdx == 0 { // Time values are repeated for every row, so we only need to do this once
// 				interfaceSlice, ok := row[timeColumnIdx].([]interface{})
// 				if !ok {
// 					return nil, fmt.Errorf("time column was not of expected type, wanted []interface{} got %T", row[timeColumnIdx])
// 				}
// 				times = make([]int64, len(interfaceSlice))
// 				for i, interfaceVal := range interfaceSlice {
// 					var err error
// 					times[i], err = extractTimeStamp(interfaceVal)
// 					if err != nil {
// 						return nil, err
// 					}
// 				}
// 			}

// 			labels, err := labelMaker(resTable.Columns, row, labelColumnIdxs)
// 			if err != nil {
// 				return nil, err
// 			}
// 			for _, valueIdx := range valueColumnIdxs {
// 				// Handle case where all values are null
// 				if interfaceIsNil(row[valueIdx]) {
// 					series := &datasource.TimeSeries{
// 						Name:   labels.GetName(resTable.Columns[valueIdx].ColumnName),
// 						Points: make([]*datasource.Point, len(times)),
// 						Tags:   labels.keyVals,
// 					}
// 					for idx, time := range times {
// 						series.Points[idx] = &datasource.Point{Timestamp: time, Value: math.NaN()}
// 					}
// 					seriesCollection = append(seriesCollection, series)
// 					continue
// 				}

// 				interfaceSlice, ok := row[valueIdx].([]interface{})
// 				if !ok {
// 					return nil, fmt.Errorf("value column was not of expected type, wanted []interface{} got %T", row[valueIdx])
// 				}
// 				series := &datasource.TimeSeries{
// 					Name:   labels.GetName(resTable.Columns[valueIdx].ColumnName),
// 					Points: make([]*datasource.Point, len(interfaceSlice)),
// 					Tags:   labels.keyVals,
// 				}
// 				for idx, interfaceVal := range interfaceSlice {
// 					if interfaceIsNil(interfaceVal) {
// 						series.Points[idx] = &datasource.Point{
// 							Timestamp: times[idx],
// 							Value:     math.NaN(),
// 						}
// 						continue
// 					}
// 					val, err := extractJSONNumberAsFloat(interfaceVal)
// 					if err != nil {
// 						return nil, err
// 					}
// 					series.Points[idx] = &datasource.Point{
// 						Timestamp: times[idx],
// 						Value:     val,
// 					}
// 				}
// 				seriesCollection = append(seriesCollection, series)
// 			}
// 		}
// 	}
// 	return seriesCollection, nil
// }
