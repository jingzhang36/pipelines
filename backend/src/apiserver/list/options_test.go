package list

import (
	"reflect"
	"testing"

	"github.com/kubeflow/pipelines/backend/src/apiserver/filter"

	sq "github.com/Masterminds/squirrel"
	"github.com/google/go-cmp/cmp"
	api "github.com/kubeflow/pipelines/backend/api/go_client"
)

func TestNewOptions_FromValidSerializedToken(t *testing.T) {
	tok := &token{
		SortByFieldName:  "SortField",
		SortByFieldValue: "string_field_value",
		KeyFieldName:     "KeyField",
		KeyFieldValue:    "string_key_value",
		IsDesc:           true,
	}

	s, err := tok.marshal()
	if err != nil {
		t.Fatalf("failed to marshal token %+v: %v", tok, err)
	}

	want := &Options{PageSize: 123, token: tok}
	got, err := NewOptionsFromToken(s, 123)

	opt := cmp.AllowUnexported(Options{})
	if !cmp.Equal(got, want, opt) || err != nil {
		t.Errorf("NewOptionsFromToken(%q, 123) =\nGot: %+v, %v\nWant: %+v, nil\nDiff:\n%s",
			s, got, err, want, cmp.Diff(want, got, opt))
	}
}

func TestNewOptionsFromToken_FromInValidSerializedToken(t *testing.T) {
	tests := []struct{ in string }{{"random nonsense"}, {""}}

	for _, test := range tests {
		got, err := NewOptionsFromToken(test.in, 123)
		if err == nil {
			t.Errorf("NewOptionsFromToken(%q, 123) =\nGot: %+v, <nil>\nWant: _, error",
				test.in, got)
		}
	}
}

func TestNewOptionsFromToken_FromInValidPageSize(t *testing.T) {
	tok := &token{
		SortByFieldName:  "SortField",
		SortByFieldValue: "string_field_value",
		KeyFieldName:     "KeyField",
		KeyFieldValue:    "string_key_value",
		IsDesc:           true,
	}

	s, err := tok.marshal()
	if err != nil {
		t.Fatalf("failed to marshal token %+v: %v", tok, err)
	}
	got, err := NewOptionsFromToken(s, -1)

	if err == nil {
		t.Errorf("NewOptionsFromToken(%q, 123) =\nGot: %+v, <nil>\nWant: _, error",
			s, got)
	}
}

func TestNewOptions_ValidSortOptions(t *testing.T) {
	pageSize := 10
	tests := []struct {
		sortBy string
		want   *Options
	}{
		{
			sortBy: "", // default sorting
			want: &Options{
				PageSize: pageSize,
				token: &token{
					KeyFieldName:    "PrimaryKey",
					SortByFieldName: "CreatedTimestamp",
					IsDesc:          false,
				},
			},
		},
		{
			sortBy: "timestamp",
			want: &Options{
				PageSize: pageSize,
				token: &token{
					KeyFieldName:    "PrimaryKey",
					SortByFieldName: "CreatedTimestamp",
					IsDesc:          false,
				},
			},
		},
		{
			sortBy: "name",
			want: &Options{
				PageSize: pageSize,
				token: &token{
					KeyFieldName:    "PrimaryKey",
					SortByFieldName: "FakeName",
					IsDesc:          false,
				},
			},
		},
		{
			sortBy: "name asc",
			want: &Options{
				PageSize: pageSize,
				token: &token{
					KeyFieldName:    "PrimaryKey",
					SortByFieldName: "FakeName",
					IsDesc:          false,
				},
			},
		},
		{
			sortBy: "name desc",
			want: &Options{
				PageSize: pageSize,
				token: &token{
					KeyFieldName:    "PrimaryKey",
					SortByFieldName: "FakeName",
					IsDesc:          true,
				},
			},
		},
		{
			sortBy: "id desc",
			want: &Options{
				PageSize: pageSize,
				token: &token{
					KeyFieldName:    "PrimaryKey",
					SortByFieldName: "PrimaryKey",
					IsDesc:          true,
				},
			},
		},
	}

	for _, test := range tests {
		got, err := NewOptions(&fakeListable{}, pageSize, test.sortBy, nil)

		opt := cmp.AllowUnexported(Options{})
		if !cmp.Equal(got, test.want, opt) || err != nil {
			t.Errorf("NewOptions(sortBy=%q) =\nGot: %+v, %v\nWant: %+v, nil\nDiff:\n%s",
				test.sortBy, got, err, test.want, cmp.Diff(got, test.want, opt))
		}
	}
}

func TestNewOptions_InvalidSortOptions(t *testing.T) {
	pageSize := 10
	tests := []struct {
		sortBy string
	}{
		{"unknownfield"},
		{"timestamp descending"},
		{"timestamp asc hello"},
	}

	for _, test := range tests {
		got, err := NewOptions(&fakeListable{}, pageSize, test.sortBy, nil)
		if err == nil {
			t.Errorf("NewOptions(sortBy=%q) =\nGot: %+v, <nil>\nWant error", test.sortBy, got)
		}
	}
}

func TestNewOptions_InvalidPageSize(t *testing.T) {
	got, err := NewOptions(&fakeListable{}, -1, "", nil)
	if err == nil {
		t.Errorf("NewOptions(pageSize=-1) =\nGot: %+v, <nil>\nWant error", got)
	}
}

func TestNewOptions_ValidFilter(t *testing.T) {
	protoFilter := &api.Filter{
		Predicates: []*api.Predicate{
			&api.Predicate{
				Key:   "name",
				Op:    api.Predicate_EQUALS,
				Value: &api.Predicate_StringValue{StringValue: "SomeName"},
			},
		},
	}

	protoFilterWithRightKeyNames := &api.Filter{
		Predicates: []*api.Predicate{
			&api.Predicate{
				Key:   "FakeName",
				Op:    api.Predicate_EQUALS,
				Value: &api.Predicate_StringValue{StringValue: "SomeName"},
			},
		},
	}

	f, err := filter.New(protoFilterWithRightKeyNames)
	if err != nil {
		t.Fatalf("failed to parse filter proto %+v: %v", protoFilter, err)
	}

	got, err := NewOptions(&fakeListable{}, 10, "timestamp", protoFilter)
	want := &Options{
		PageSize: 10,
		token: &token{
			KeyFieldName:    "PrimaryKey",
			SortByFieldName: "CreatedTimestamp",
			IsDesc:          false,
			Filter:          f,
		},
	}

	opts := []cmp.Option{
		cmp.AllowUnexported(Options{}),
		cmp.AllowUnexported(filter.Filter{}),
	}

	if !cmp.Equal(got, want, opts...) || err != nil {
		t.Errorf("NewOptions(protoFilter=%+v) =\nGot: %+v, %v\nWant: %+v, nil\nDiff:\n%s",
			protoFilter, got, err, want, cmp.Diff(got, want, opts...))
	}
}

func TestNewOptions_InvalidFilter(t *testing.T) {
	protoFilter := &api.Filter{
		Predicates: []*api.Predicate{
			&api.Predicate{
				Key:   "unknownfield",
				Op:    api.Predicate_EQUALS,
				Value: &api.Predicate_StringValue{StringValue: "SomeName"},
			},
		},
	}

	got, err := NewOptions(&fakeListable{}, 10, "timestamp", protoFilter)
	if err == nil {
		t.Errorf("NewOptions(protoFilter=%+v) =\nGot: %+v, <nil>\nWant error", protoFilter, got)
	}
}

func TestAddPaginationAndFilterToSelect(t *testing.T) {
	protoFilter := &api.Filter{
		Predicates: []*api.Predicate{
			&api.Predicate{
				Key:   "Name",
				Op:    api.Predicate_EQUALS,
				Value: &api.Predicate_StringValue{StringValue: "SomeName"},
			},
		},
	}
	f, err := filter.New(protoFilter)
	if err != nil {
		t.Fatalf("failed to parse filter proto %+v: %v", protoFilter, err)
	}

	tests := []struct {
		in       *Options
		wantSQL  string
		wantArgs []interface{}
	}{
		{
			in: &Options{
				PageSize: 123,
				token: &token{
					SortByFieldName:  "SortField",
					SortByFieldValue: "value",
					KeyFieldName:     "KeyField",
					KeyFieldValue:    1111,
					IsDesc:           true,
				},
			},
			wantSQL:  "SELECT * FROM MyTable WHERE (SortField < ? OR (SortField = ? AND KeyField <= ?)) ORDER BY SortField DESC, KeyField DESC LIMIT 124",
			wantArgs: []interface{}{"value", "value", 1111},
		},
		{
			in: &Options{
				PageSize: 123,
				token: &token{
					SortByFieldName:  "SortField",
					SortByFieldValue: "value",
					KeyFieldName:     "KeyField",
					KeyFieldValue:    1111,
					IsDesc:           false,
				},
			},
			wantSQL:  "SELECT * FROM MyTable WHERE (SortField > ? OR (SortField = ? AND KeyField >= ?)) ORDER BY SortField ASC, KeyField ASC LIMIT 124",
			wantArgs: []interface{}{"value", "value", 1111},
		},
		{
			in: &Options{
				PageSize: 123,
				token: &token{
					SortByFieldName:  "SortField",
					SortByFieldValue: "value",
					KeyFieldName:     "KeyField",
					KeyFieldValue:    1111,
					IsDesc:           false,
					Filter:           f,
				},
			},
			wantSQL:  "SELECT * FROM MyTable WHERE (SortField > ? OR (SortField = ? AND KeyField >= ?)) AND Name = ? ORDER BY SortField ASC, KeyField ASC LIMIT 124",
			wantArgs: []interface{}{"value", "value", 1111, "SomeName"},
		},
		{
			in: &Options{
				PageSize: 123,
				token: &token{
					SortByFieldName: "SortField",
					KeyFieldName:    "KeyField",
					KeyFieldValue:   1111,
					IsDesc:          true,
				},
			},
			wantSQL:  "SELECT * FROM MyTable ORDER BY SortField DESC, KeyField DESC LIMIT 124",
			wantArgs: nil,
		},
		{
			in: &Options{
				PageSize: 123,
				token: &token{
					SortByFieldName:  "SortField",
					SortByFieldValue: "value",
					KeyFieldName:     "KeyField",
					IsDesc:           false,
				},
			},
			wantSQL:  "SELECT * FROM MyTable ORDER BY SortField ASC, KeyField ASC LIMIT 124",
			wantArgs: nil,
		},
		{
			in: &Options{
				PageSize: 123,
				token: &token{
					SortByFieldName:  "SortField",
					SortByFieldValue: "value",
					KeyFieldName:     "KeyField",
					IsDesc:           false,
					Filter:           f,
				},
			},
			wantSQL:  "SELECT * FROM MyTable WHERE Name = ? ORDER BY SortField ASC, KeyField ASC LIMIT 124",
			wantArgs: []interface{}{"SomeName"},
		},
	}

	for _, test := range tests {
		sql := sq.Select("*").From("MyTable")
		gotSQL, gotArgs, err := test.in.AddFilterToSelect(test.in.AddPaginationToSelect(sql)).ToSql()

		if gotSQL != test.wantSQL || !reflect.DeepEqual(gotArgs, test.wantArgs) || err != nil {
			t.Errorf("BuildListSQLQuery(%+v) =\nGot: %q, %v, %v\nWant: %q, %v, nil",
				test.in, gotSQL, gotArgs, err, test.wantSQL, test.wantArgs)
		}
	}
}

func TestOptionMatches(t *testing.T) {
	tests := []struct {
		o1   *Options
		o2   *Options
		want bool
	}{
		{
			o1:   &Options{token: &token{SortByFieldName: "SortField1", IsDesc: true}},
			o2:   &Options{token: &token{SortByFieldName: "SortField2", IsDesc: true}},
			want: false,
		},
		{
			o1:   &Options{token: &token{SortByFieldName: "SortField1", IsDesc: true}},
			o2:   &Options{token: &token{SortByFieldName: "SortField1", IsDesc: true}},
			want: true,
		},
		{
			o1:   &Options{token: &token{SortByFieldName: "SortField1", IsDesc: true}},
			o2:   &Options{token: &token{SortByFieldName: "SortField1", IsDesc: false}},
			want: false,
		},
		{
			o1:   &Options{token: &token{Filter: f1}},
			o2:   &Options{token: &token{Filter: f1}},
			want: true,
		},
		{
			o1:   &Options{token: &token{Filter: f1}},
			o2:   &Options{token: &token{Filter: f2}},
			want: false,
		},
	}

	for _, test := range tests {
		got := test.o1.Matches(test.o2)

		if got != test.want {
			t.Errorf("Matches(%+v, %+v) = %v, Want nil %v", test.o1, test.o2, got, test.want)
			continue
		}
	}
}

func TestSortByRunMetrics(t *testing.T) {

}
