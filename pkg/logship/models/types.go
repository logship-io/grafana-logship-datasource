package models

// options are properties that can be set on the Logship Connection string.
type options struct {
	DataConsistency string `json:"queryconsistency,omitempty"`
	CacheMaxAge     string `json:"query_results_cache_max_age,omitempty"`
	ServerTimeout   string `json:"servertimeout,omitempty"`
}

type RequestPayload struct {
	Query       string      `json:"query"`
	QuerySource string      `json:"querySource"`
	Properties  *Properties `json:"properties,omitempty"`
}

type LogshipFrameMD struct {
	ColumnTypes []string
}

// error body,
type ErrorResponse struct {
	Message    string                  `json:"message"`
	StackTrace string                  `json:"stackTrace"`
	Errors     []TokenizedErrorMessage `json:"errors"`
}

type TokenizedErrorMessage struct {
	Message string  `json:"message"`
	Tokens  []Token `json:"tokens"`
}

type Token struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

type WhoAmIResponse struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	NickName  string `json:"nickName"`
	UserID    string `json:"userId"`
	UserName  string `json:"userName"`
	Email     string `json:"email"`
}

// Properties is a property bag of connection string options.
type Properties struct {
	Options *options `json:"options,omitempty"`
}

// NewConnectionProperties creates Logship connection properties based on datasource settings.
func NewConnectionProperties(s *DatasourceSettings, cs *CacheSettings) *Properties {
	cacheMaxAge := s.CacheMaxAge
	if cs != nil {
		cacheMaxAge = cs.CacheMaxAge
	}

	return &Properties{
		&options{
			CacheMaxAge:   cacheMaxAge,
			ServerTimeout: s.ServerTimeoutValue,
		},
	}
}

type JwtTokenRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type JwtTokenResponse struct {
	UserId string `json:"userId"`
	Token  string `json:"token"`
}
