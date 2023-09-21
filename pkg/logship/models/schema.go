package models

import (
	"fmt"
	"io"

	jsoniter "github.com/json-iterator/go"
)

// Column is a descriptor within a TableResponse
type ColumnSchema struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type TableSchema struct {
	Name    string         `json:"name"`
	Columns []ColumnSchema `json:"columns"`
}

type DatabaseSchemaResponse struct {
	Name   string        `json:"name"`
	Tables []TableSchema `json:"tables"`
}

func SchemaFromJSON(rc io.Reader) ([]TableSchema, error) {
	var tr = []TableSchema{}
	decoder := jsoniter.NewDecoder(rc)
	// Numbers as string (json.Number) so we can keep types as best we can (since the response has 'type' of column)
	decoder.UseNumber()
	err := decoder.Decode(&tr)
	if err != nil {
		return nil, err
	}
	if tr == nil || len(tr) == 0 {
		return nil, fmt.Errorf("unable to parse response, parsed response has no tables")
	}

	return tr, nil
}
