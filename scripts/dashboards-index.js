// Generated from local dashboard files
// Timestamp: 2025-07-27T04:37:56.417Z
// Total dashboards: 71

export const DASHBOARDS_INDEX = [
  {
    "dashboard_name": "bed_util",
    "data_last_updated": "2024-09-07 01:00",
    "data_next_update": "2024-09-08 01:00",
    "route": "/dashboard/hospital-bed-utilisation,/ms-MY/dashboard/hospital-bed-utilisation",
    "sites": [
      "kkmnow"
    ],
    "manual_trigger": "2023-11-22 06:53:16.74966",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "choropleth_malaysia": {
        "name": "choropleth_malaysia",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/bedutil_choropleth_state.parquet",
        "data_as_of": "2024-09-06 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "beds_nonicu",
            "util_nonicu",
            "beds_icu",
            "util_icu",
            "vent",
            "util_vent"
          ]
        }
      },
      "table_facility": {
        "name": "table_facility",
        "chart_type": "snapshot_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/bedutil_table_facility.parquet",
        "data_as_of": "2024-09-06 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "main_key": "state",
          "replace_word": "",
          "data": {
            "data": [
              "hospital",
              "beds_nonicu",
              "util_nonicu",
              "beds_icu",
              "util_icu",
              "vent",
              "util_vent"
            ]
          }
        }
      },
      "timeseries_dropdown": {
        "name": "timeseries_dropdown",
        "chart_type": "query_values",
        "chart_source": "https://storage.data.gov.my/dashboards/bedutil_timeseries_facility.parquet",
        "data_as_of": "2024-09-06 23:59",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "columns": [
            "hospital"
          ]
        }
      },
      "timeseries_facility": {
        "name": "timeseries_facility",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/bedutil_timeseries_facility.parquet",
        "data_as_of": "2024-09-06 23:59",
        "api_type": "dynamic",
        "api_params": [
          "hospital"
        ],
        "variables": {
          "keys": [
            "hospital"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "beds_nonicu",
            "util_nonicu",
            "beds_icu",
            "util_icu",
            "vent",
            "util_vent"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "birthday_popularity",
    "data_last_updated": "2023-06-01 23:59",
    "route": "/dashboard/birthday-explorer,/ms-MY/dashboard/birthday-explorer",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "",
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/birthday_timeseries.parquet",
        "data_as_of": "2022-12-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "births",
            "rank"
          ]
        }
      },
      "rank_table": {
        "name": "rank_table",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/birthday_rank.parquet",
        "data_as_of": "2022-12-31 13:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "state",
            "year"
          ],
          "value_columns": [
            "year_popular",
            "year_rare"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "blood_donation",
    "data_last_updated": "2025-07-27 05:00",
    "data_next_update": "2025-07-28 05:00",
    "route": "/dashboard/blood-donation,/ms-MY/dashboard/blood-donation",
    "sites": [
      "kkmnow"
    ],
    "manual_trigger": "2023-11-22 06:53:16.74125",
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "bar_chart_age": {
        "name": "bar_chart_age",
        "chart_type": "bar_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/blood_barchart_age.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "period"
          ],
          "rename_cols": {
            "age_group": "x",
            "new_donors": "y"
          },
          "x": "x",
          "y": [
            "y"
          ]
        }
      },
      "bar_chart_time": {
        "name": "bar_chart_time",
        "chart_type": "bar_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/blood_barchart_time.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "type"
          ],
          "rename_cols": {
            "period": "x",
            "new_donors": "y"
          },
          "x": "x",
          "y": [
            "y"
          ]
        }
      },
      "timeseries_all": {
        "name": "timeseries_all",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/blood_timeseries.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "frequency"
          ],
          "rename_cols": {
            "date": "x",
            "daily": "y"
          },
          "value_columns": [
            "x",
            "y"
          ]
        }
      },
      "barchart_key_variables": {
        "name": "barchart_key_variables",
        "chart_type": "bar_meter",
        "chart_source": "https://storage.data.gov.my/dashboards/blood_barcharts.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "axis_values": [
            {
              "variable": "value"
            }
          ],
          "keys": [
            "state",
            "period",
            "chart"
          ]
        }
      },
      "choropleth_malaysia": {
        "name": "choropleth_malaysia",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/blood_choropleth_msia.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "perc"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "bomba",
    "data_last_updated": "2023-06-01 23:59",
    "route": "/dashboard/fire-and-rescue,/ms-MY/dashboard/fire-and-rescue",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2",
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/bomba_timeseries.parquet",
        "data_as_of": "2023-06-05 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "frequency"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "fire",
            "rescue",
            "others",
            "overall"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/bomba_timeseries_callout.parquet",
        "data_as_of": "2023-06-05 23:59",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "keys": [
            "state",
            "chart",
            "variable"
          ],
          "value_columns": [
            "value"
          ]
        }
      },
      "choropleth": {
        "name": "choropleth",
        "chart_type": "choropleth_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/bomba_choropleth_state.parquet ",
        "data_as_of": "2023-05-16 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "value"
          ],
          "keys": [
            "variable"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "bop",
    "data_last_updated": "2025-05-16 12:00",
    "data_next_update": "2025-08-15 12:00",
    "route": "/dashboard/balance-of-payments,/ms-MY/dashboard/balance-of-payments",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2025-05-16 11:58:52.838710",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "bop_snapshot": {
        "name": "bop_snapshot",
        "chart_type": "snapshot_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/bop_snapshot.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "date"
          ],
          "main_key": "variable",
          "replace_word": "",
          "data": {
            "data": [
              "net",
              "credit",
              "debit"
            ]
          }
        }
      },
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/bop_timeseries.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "bop",
            "ca",
            "ca_goods",
            "ca_services",
            "ca_primary",
            "ca_secondary",
            "ka",
            "fa",
            "fa_dia",
            "fa_pi",
            "fa_derivatives",
            "fa_other",
            "neo",
            "recession"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/bop_timeseries_callout.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "latest",
            "change"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "business_creation",
    "data_last_updated": "2023-08-21 23:59",
    "route": "/dashboard/business-creation-destruction,/ms-MY/dashboard/business-creation-destruction",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "",
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/ssm_timeseries.parquet",
        "data_as_of": "2023-08-21 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "frequency"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "reg_llp",
            "reg_roc",
            "reg_rob",
            "death_llp",
            "death_roc",
            "death_rob"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/ssm_timeseries_callout.parquet",
        "data_as_of": "2023-08-21 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart"
          ],
          "value_columns": [
            "this_year"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "car_popularity",
    "data_last_updated": "2025-07-11 16:13",
    "data_next_update": "2025-08-11 16:00",
    "route": "/dashboard/car-popularity,/ms-MY/dashboard/car-popularity",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2025-07-11 16:04:21.886496",
    "required_params": [],
    "optional_params": [
      "maker",
      "model"
    ],
    "charts": {
      "vehicle_timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/vehicles_timeseries.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "frequency"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "bus",
            "car",
            "lorry",
            "motorcycle",
            "other",
            "van"
          ]
        }
      },
      "vehicle_timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/vehicles_timeseries_callout.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "value_columns": [
            "latest",
            "alltime"
          ]
        }
      },
      "top_makers": {
        "name": "top_makers",
        "chart_type": "metrics_table",
        "chart_source": "https://storage.data.gov.my/dashboards/car_popularity_makers.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "date"
          ],
          "value_columns": [
            "maker",
            "vehicles"
          ]
        }
      },
      "top_models": {
        "name": "top_models",
        "chart_type": "metrics_table",
        "chart_source": "https://storage.data.gov.my/dashboards/car_popularity_models.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "date"
          ],
          "value_columns": [
            "maker",
            "model",
            "vehicles"
          ]
        }
      },
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/car_popularity_timeseries.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "individual_chart",
        "api_params": [
          "maker",
          "model"
        ],
        "variables": {
          "keys": [
            "maker",
            "model"
          ],
          "rename_cols": {
            "date": "x"
          },
          "constants": [
            "x"
          ],
          "value_columns": [
            "cars"
          ]
        }
      },
      "query_values": {
        "name": "query_values",
        "chart_type": "query_values",
        "chart_source": "https://storage.data.gov.my/dashboards/car_popularity_timeseries.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "columns": [
            "maker",
            "model"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "composite_indices",
    "manual_trigger": "2025-07-25 12:08:46.655602",
    "data_last_updated": "2025-07-25 12:00",
    "data_next_update": "2025-08-25 12:00",
    "route": "/dashboard/composite-indices,/ms-MY/dashboard/composite-indices",
    "sites": [
      "opendosm"
    ],
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/mei_timeseries.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "leading",
            "coincident",
            "lagging",
            "leading_diffusion",
            "coincident_diffusion",
            "flag_recession_business",
            "flag_recession_growth"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/mei_timeseries_callout.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "value_columns": [
            "callout1",
            "callout2",
            "callout3"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "construction",
    "data_last_updated": "2025-05-09 12:00",
    "data_next_update": "2025-08-11 12:00",
    "route": "/dashboard/construction-statistics,/ms-MY/dashboard/construction-statistics",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2025-05-17 06:44:15.548170",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/construction_timeseries.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "projects",
            "value",
            "recession"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/construction_timeseries_callout.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      },
      "timeseries_projowner": {
        "name": "timeseries_projowner",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/construction_projowner_timeseries.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "project_owner",
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "total",
            "residential",
            "non_residential",
            "civileng",
            "special",
            "recession"
          ]
        }
      },
      "timeseries_projowner_callout": {
        "name": "timeseries_projowner_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/construction_projowner_timeseries_callout.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "project_owner",
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "consumer_price_index",
    "data_last_updated": "2025-07-22 12:00",
    "data_next_update": "2025-08-22 12:00",
    "route": "/dashboard/consumer-prices,/ms-MY/dashboard/consumer-prices",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2025-02-11 10:45:08.473969",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "bar_chart": {
        "name": "bar_chart",
        "chart_type": "bar_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/cpi_main_barchart.parquet",
        "data_as_of": "2025-06",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "period",
            "state"
          ],
          "rename_cols": {
            "variable": "x",
            "value": "y"
          },
          "x": "x",
          "y": [
            "y"
          ]
        }
      },
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/cpi_main_timeseries.parquet",
        "data_as_of": "2025-06",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "series_type",
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "00",
            "01",
            "02",
            "03",
            "04",
            "05",
            "06",
            "07",
            "08",
            "09",
            "10",
            "11",
            "12",
            "13",
            "recession"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/cpi_main_timeseries_callout.parquet",
        "data_as_of": "2025-06",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "series_type",
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "callout"
          ]
        }
      },
      "timeseries_6d": {
        "name": "timeseries_6d",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/cpi_query_timeseries_4d.parquet",
        "data_as_of": "2025-06",
        "api_type": "individual_chart",
        "api_params": [
          "lang",
          "level"
        ],
        "variables": {
          "keys": [
            "lang",
            "level",
            "name"
          ],
          "rename_cols": {
            "date": "x",
            "value": "y"
          },
          "constants": [
            "x"
          ],
          "value_columns": [
            "y"
          ]
        }
      },
      "snapshot_4d": {
        "name": "snapshot_4d",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/cpi_query_snapshot_4d.parquet?ignoreCache=0",
        "data_as_of": "2025-06",
        "api_type": "individual_chart",
        "api_params": [
          "lang",
          "level"
        ],
        "variables": {
          "keys": [
            "lang",
            "level",
            "name"
          ],
          "rename_cols": {
            "date": "x",
            "weight": "y1",
            "yoy_latest": "y2",
            "yoy_avg": "y3",
            "mom_latest": "y4",
            "mom_avg": "y5"
          },
          "constants": [
            "x"
          ],
          "value_columns": [
            "y1",
            "y2",
            "y3",
            "y4",
            "y5"
          ]
        }
      },
      "choropleth_district": {
        "name": "choropleth_district",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/cpi_district.parquet",
        "data_as_of": "2025-06",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "y": [
            "coicop_017101",
            "coicop_017120",
            "coicop_017118",
            "coicop_0171302",
            "coicop_0171221",
            "coicop_0171222",
            "coicop_017139",
            "coicop_017126",
            "coicop_0171091",
            "coicop_0171342",
            "coicop_0171041",
            "coicop_017125",
            "coicop_017119",
            "coicop_017123",
            "coicop_0161263",
            "coicop_016118",
            "coicop_016119",
            "coicop_0161013",
            "coicop_016301",
            "coicop_016304",
            "coicop_0144013",
            "coicop_013103",
            "coicop_013101",
            "coicop_0121041",
            "coicop_012101",
            "coicop_0132032",
            "coicop_013205",
            "coicop_013202",
            "coicop_0011222",
            "coicop_001128",
            "coicop_1111021"
          ],
          "x": "district"
        }
      }
    }
  },
  {
    "dashboard_name": "covid_epid",
    "manual_trigger": "",
    "data_last_updated": "2025-06-01 12:00",
    "data_next_update": "2025-06-08 12:00",
    "route": "/dashboard/covid-19,/ms-MY/dashboard/covid-19",
    "sites": [
      "kkmnow"
    ],
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "bar_chart": {
        "name": "bar_chart",
        "chart_type": "bar_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/covidepid_bar.parquet",
        "data_as_of": "2025-05-31 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "variable",
            "metric"
          ],
          "rename_cols": {
            "age": "x"
          },
          "x": "x",
          "y": [
            "unvax",
            "partialvax",
            "fullyvax",
            "boosted"
          ]
        }
      },
      "snapshot_bar": {
        "name": "snapshot_bar",
        "chart_type": "bar_meter",
        "chart_source": "https://storage.data.gov.my/dashboards/covidepid_snapshot_bar.parquet",
        "data_as_of": "2025-05-31 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "axis_values": [
            {
              "state": "deaths"
            },
            {
              "state": "cases"
            },
            {
              "state": "util_hosp"
            },
            {
              "state": "util_icu"
            },
            {
              "state": "util_vent"
            }
          ],
          "sub_keys": true
        }
      },
      "snapshot_graphic": {
        "name": "snapshot_graphic",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/covidepid_snapshot_graphic.parquet",
        "data_as_of": "2025-05-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "value_columns": [
            "cases_active",
            "cases_active_annot",
            "pkrc",
            "pkrc_annot",
            "hosp",
            "hosp_annot",
            "icu",
            "icu_annot",
            "vent",
            "vent_annot",
            "home",
            "home_annot",
            "cases_local",
            "cases_local_annot",
            "cases_import",
            "cases_import_annot",
            "cases_recovered",
            "cases_recovered_annot",
            "deaths",
            "deaths_annot",
            "deaths_bid",
            "deaths_bid_annot"
          ],
          "keys": [
            "state"
          ]
        }
      },
      "snapshot_table": {
        "name": "snapshot_table",
        "chart_type": "snapshot_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/covidepid_snapshot_table.parquet",
        "data_as_of": "2025-05-31 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "main_key": "state",
          "replace_word": "",
          "data": {
            "deaths": [
              "deaths",
              "deaths_100k",
              "deaths_trend"
            ],
            "cases": [
              "cases",
              "cases_100k",
              "cases_posrate",
              "cases_trend"
            ],
            "admitted": [
              "admitted",
              "util_hosp",
              "admitted_trend"
            ]
          }
        }
      },
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/covidepid_timeseries.parquet",
        "data_as_of": "2025-05-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "frequency"
          ],
          "rename_cols": {
            "date": "x",
            "deaths_inp_dod": "deaths_inpatient",
            "deaths_bid_dod": "deaths_brought_in",
            "deaths_dod": "deaths_tooltip",
            "tests_posrate": "tests_tooltip"
          },
          "value_columns": [
            "x",
            "admitted",
            "cases",
            "deaths_inpatient",
            "deaths_brought_in",
            "deaths_tooltip",
            "icu",
            "tests_pcr",
            "tests_rtk",
            "tests_tooltip",
            "vent"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/covidepid_timeseries_keystats.parquet",
        "data_as_of": "2025-05-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart_type"
          ],
          "value_columns": [
            "annot1",
            "annot2"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "covid_vax",
    "data_last_updated": "2025-02-23 01:00",
    "data_next_update": "2025-02-24 01:00",
    "route": "/dashboard/covid-vaccination,/ms-MY/dashboard/covid-vaccination",
    "sites": [
      "kkmnow"
    ],
    "manual_trigger": "2023-11-22 06:53:16.73531",
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "bar_chart": {
        "name": "bar_chart",
        "chart_type": "bar_meter",
        "chart_source": "https://storage.data.gov.my/dashboards/covidvax_waffle.parquet",
        "data_as_of": "2025-02-22 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "axis_values": [
            {
              "age_group": "value"
            }
          ],
          "keys": [
            "state",
            "dose"
          ],
          "filter": {
            "age_group": [
              "0-4",
              "5-11",
              "12-17",
              "18-29",
              "30-39",
              "40-49",
              "50-59",
              "60-69",
              "70-79",
              "80+"
            ],
            "metric": [
              "perc"
            ]
          }
        }
      },
      "snapshot": {
        "name": "snapshot",
        "chart_type": "snapshot_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/covidvax_snapshot.parquet",
        "data_as_of": "2025-02-22 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "main_key": "state",
          "replace_word": "perc",
          "data": {
            "total": [
              "total_booster1",
              "total_booster2",
              "total_dose1",
              "total_dose2"
            ],
            "adol": [
              "adol_booster1",
              "adol_booster2",
              "adol_dose1",
              "adol_dose2"
            ],
            "child": [
              "child_booster1",
              "child_booster2",
              "child_dose1",
              "child_dose2"
            ],
            "adult": [
              "adult_booster1",
              "adult_booster2",
              "adult_dose1",
              "adult_dose2"
            ]
          }
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/covidvax_timeseries_keystats.parquet",
        "data_as_of": "2025-02-22 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart_type"
          ],
          "value_columns": [
            "latest",
            "total"
          ]
        }
      },
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/covidvax_timeseries.parquet",
        "data_as_of": "2025-02-22 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "frequency"
          ],
          "rename_cols": {
            "date": "x",
            "daily": "y",
            "daily_primary": "primary",
            "daily_booster": "booster",
            "daily_booster2": "booster2",
            "daily_adult": "adult",
            "daily_adol": "adol",
            "daily_child": "child"
          },
          "value_columns": [
            "x",
            "y",
            "primary",
            "booster",
            "booster2",
            "adult",
            "adol",
            "child"
          ]
        }
      },
      "waffle": {
        "name": "waffle",
        "chart_type": "waffle_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/covidvax_waffle.parquet",
        "data_as_of": "2025-02-22 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "filter": {
            "age_group": [
              "adult",
              "child",
              "elderly",
              "adolescent",
              "total"
            ]
          },
          "keys": [
            "state",
            "age_group",
            "dose"
          ],
          "dict_keys": [
            "metric",
            "value"
          ],
          "data_arr": {
            "id": "dose",
            "label": "dose",
            "value": {
              "metric": "perc"
            }
          }
        }
      }
    }
  },
  {
    "dashboard_name": "currency",
    "data_last_updated": "2025-05-31 15:00",
    "data_next_update": "2025-06-30 15:00",
    "manual_trigger": "",
    "route": "/dashboard/currency-in-circulation,/ms-MY/dashboard/currency-in-circulation",
    "sites": [
      "datagovmy"
    ],
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/currency_timeseries.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "total",
            "note_1",
            "note_2",
            "note_5",
            "note_10",
            "note_20",
            "note_50",
            "note_100",
            "note_500",
            "note_1000",
            "note_others",
            "coin_1",
            "coin_5",
            "coin_10",
            "coin_20",
            "coin_50",
            "coin_rm1",
            "coin_rm5",
            "coin_others",
            "recession",
            "cny",
            "eid"
          ]
        }
      },
      "bar_chart": {
        "name": "bar_chart",
        "chart_type": "bar_meter",
        "chart_source": "https://storage.data.gov.my/dashboards/currency_barmeter.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "axis_values": [
            {
              "variable": "value"
            }
          ],
          "keys": [
            "chart"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/currency_timeseries_callout.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "callout"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "dashboards",
    "data_last_updated": "2025-07-27 00:01",
    "route": "",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2025-07-27 00:16:12.808716",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "query_values": {
        "name": "agency_dropdown",
        "chart_type": "query_values",
        "chart_source": "https://storage.data.gov.my/dashboards/dashboards_all.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "columns": [
            "agency"
          ],
          "sort_values": {
            "by": [
              "agency"
            ],
            "ascending": [
              true
            ]
          }
        }
      },
      "dashboards_top": {
        "name": "dashboards_top",
        "chart_type": "metrics_table",
        "chart_source": "https://storage.data.gov.my/dashboards/dashboards_top.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "time_period"
          ],
          "value_columns": [
            "name",
            "agency",
            "views"
          ]
        }
      },
      "dashboards_all": {
        "name": "dashboards_all",
        "chart_type": "metrics_table",
        "chart_source": "https://storage.data.gov.my/dashboards/dashboards_all.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "category"
          ],
          "value_columns": [
            "name",
            "agency",
            "views"
          ]
        }
      },
      "dashboards_route": {
        "name": "dashboards_route",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/dashboards_all.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "name"
          ],
          "value_columns": [
            "route"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "dashboards2",
    "data_last_updated": "2025-06-10 20:00",
    "route": "/dashboard,/ms-MY/dashboard",
    "sites": [
      "datagovmy",
      "opendosm"
    ],
    "manual_trigger": "2025-06-10 20:14:52.321243",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "query_values": {
        "name": "agency_dropdown",
        "chart_type": "query_values",
        "chart_source": "https://storage.data.gov.my/dashboards/dashboards_all_new.parquet",
        "data_as_of": "2025-06-10 20:00",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "columns": [
            "agency"
          ],
          "sort_values": {
            "by": [
              "agency"
            ],
            "ascending": [
              true
            ]
          }
        }
      },
      "dashboards": {
        "name": "dashboards",
        "chart_type": "metrics_table",
        "chart_source": "https://storage.data.gov.my/dashboards/dashboards_all_new.parquet",
        "data_as_of": "2025-06-10 20:00",
        "api_type": "dynamic",
        "api_params": [
          "site"
        ],
        "variables": {
          "keys": [
            "site"
          ],
          "value_columns": [
            "last_updated",
            "agency",
            "name",
            "route"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "databnm_homepage",
    "data_last_updated": "2024-04-22 00:01",
    "route": "/,/ms-MY/",
    "sites": [
      "databnm"
    ],
    "manual_trigger": "2024-04-22 00:16:20.442287",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries_opr": {
        "name": "timeseries_opr",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/databnm_home_opr.parquet",
        "data_as_of": "2024-04-22 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "opr"
          ]
        }
      },
      "timeseries_reserves_usd": {
        "name": "timeseries_reserves_usd",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/databnm_home_reserves_usd.parquet",
        "data_as_of": "2024-04-22 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "reserves_usd"
          ]
        }
      },
      "timeseries_myr_usd": {
        "name": "timeseries_myr_usd",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/databnm_home_myr_usd.parquet",
        "data_as_of": "2024-04-22 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "myr_usd"
          ]
        }
      },
      "timeseries_gdp_growth": {
        "name": "timeseries_gdp_growth",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/databnm_home_gdp_growth.parquet",
        "data_as_of": "2024-04-22 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "gdp_growth"
          ]
        }
      },
      "timeseries_inflation": {
        "name": "timeseries_inflation",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/databnm_home_inflation.parquet",
        "data_as_of": "2024-04-22 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "inflation"
          ]
        }
      },
      "timeseries_unemployment": {
        "name": "timeseries_unemployment",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/databnm_home_unemployment.parquet",
        "data_as_of": "2024-04-22 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "unemployment"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/databnm_home_callout.parquet",
        "data_as_of": "2024-04-22 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "callout1",
            "callout2"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "digital_business",
    "data_last_updated": "2024-04-22 00:01",
    "route": "/,/ms-MY/",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2024-04-22 00:16:20.442287",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/digital_biz_timeseries.parquet",
        "data_as_of": "2021",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "sector"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "computer",
            "internet",
            "web_presence"
          ]
        }
      },
      "choropleth_state": {
        "name": "choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/digital_biz_state.parquet",
        "data_as_of": "2024-01-01 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "computer",
            "internet",
            "web_presence"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "digital_ecommerce",
    "data_last_updated": "2024-04-22 00:01",
    "route": "/,/ms-MY/",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2024-04-22 00:16:20.442287",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "choropleth_state": {
        "name": "choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/digital_ecommerce_state.parquet",
        "data_as_of": "2024-01-01 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "income",
            "expenditure",
            "income_capita",
            "expenditure_capita",
            "population"
          ]
        }
      },
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/digital_ecommerce_timeseries.parquet",
        "data_as_of": "2021",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "type",
            "sector"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "total",
            "domestic",
            "international",
            "b2b",
            "b2c",
            "b2g"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/digital_ecommerce_timeseries_callout.parquet",
        "data_as_of": "2021",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "type",
            "sector",
            "chart"
          ],
          "value_columns": [
            "latest",
            "cagr"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "digital_economy",
    "data_last_updated": "2024-04-22 00:01",
    "route": "/dashboard/digital-economy,/ms-MY/dashboard/digital-economy",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2024-04-22 00:16:20.442287",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "business_timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/digital_biz_timeseries.parquet",
        "data_as_of": "2021",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "sector"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "computer",
            "internet",
            "web_presence"
          ]
        }
      },
      "business_choropleth_state": {
        "name": "choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/digital_biz_state.parquet",
        "data_as_of": "2024-01-01 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "computer",
            "internet",
            "web_presence"
          ]
        }
      },
      "ecommerce_choropleth_state": {
        "name": "choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/digital_ecommerce_state.parquet",
        "data_as_of": "2024-01-01 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "income",
            "expenditure",
            "income_capita",
            "expenditure_capita",
            "population"
          ]
        }
      },
      "ecommerce_timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/digital_ecommerce_timeseries.parquet",
        "data_as_of": "2021",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "type",
            "sector"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "total",
            "domestic",
            "international",
            "b2b",
            "b2c",
            "b2g"
          ]
        }
      },
      "ecommerce_timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/digital_ecommerce_timeseries_callout.parquet",
        "data_as_of": "2021",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "type",
            "sector",
            "chart"
          ],
          "value_columns": [
            "latest",
            "cagr"
          ]
        }
      },
      "household_timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/digital_hh_timeseries.parquet",
        "data_as_of": "2023",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "state"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "mobile_phone",
            "computer",
            "internet"
          ]
        }
      },
      "household_timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/digital_hh_timeseries_callout.parquet",
        "data_as_of": "2023",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "state",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      },
      "household_choropleth_state": {
        "name": "choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/digital_hh_state.parquet",
        "data_as_of": "2024-01-01 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "mobile_phone",
            "computer",
            "internet"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "digital_society",
    "data_last_updated": "2024-04-22 00:01",
    "route": "/,/ms-MY/",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2024-04-22 00:16:20.442287",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/digital_hh_timeseries.parquet",
        "data_as_of": "2021",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "state"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "mobile_phone",
            "computer",
            "internet"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/digital_hh_timeseries_callout.parquet",
        "data_as_of": "2021",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "state",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      },
      "choropleth_state": {
        "name": "choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/digital_hh_state.parquet",
        "data_as_of": "2024-01-01 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "mobile_phone",
            "computer",
            "internet"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "drug_addiction",
    "data_last_updated": "2024-10-16 12:00",
    "data_next_update": "2025-10-16 12:00",
    "route": "/dashboard/drug-addiction,/ms-MY/dashboard/drug-addiction",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/drugaddiction_timeseries.parquet",
        "data_as_of": "2023",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "state"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "total",
            "male",
            "female"
          ]
        }
      },
      "barmeter": {
        "name": "barmeter",
        "chart_type": "bar_meter",
        "chart_source": "https://storage.data.gov.my/dashboards/drugaddiction_barmeter.parquet",
        "data_as_of": "2023",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "axis_values": [
            {
              "variable": "value"
            }
          ],
          "keys": [
            "state",
            "chart"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "election_trivia",
    "data_last_updated": "2023-06-14 23:59",
    "route": "/election/trivia,/ms-MY/election/trivia",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "1",
    "required_params": [],
    "optional_params": [
      "state"
    ],
    "charts": {
      "table_top": {
        "name": "table_top",
        "chart_type": "metrics_table",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/elections_slim_big.parquet",
        "data_as_of": "2023-06-14 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "type",
            "metric"
          ],
          "value_columns": [
            "election_name",
            "date",
            "seat",
            "party",
            "name",
            "majority"
          ]
        }
      },
      "parlimen_bar": {
        "name": "parlimen_bar",
        "chart_type": "bar_meter",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/elections_veteran_parlimen.parquet",
        "data_as_of": "2023-06-14 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "axis_values": [
            {
              "name": "competed"
            },
            {
              "name": "won"
            }
          ],
          "keys": [
            "state"
          ],
          "sub_keys": true
        }
      },
      "dun_bar": {
        "name": "dun_bar",
        "chart_type": "bar_meter",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/elections_veteran_dun.parquet",
        "data_as_of": "2023-06-14 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "axis_values": [
            {
              "name": "competed"
            },
            {
              "name": "won"
            }
          ],
          "keys": [
            "state"
          ],
          "sub_keys": true
        }
      }
    }
  },
  {
    "dashboard_name": "epayment",
    "data_last_updated": "2024-09-06 15:00",
    "data_next_update": "2024-10-06 15:00",
    "route": "/dashboard/electronic-payments,/ms-MY/dashboard/electronic-payments",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2025-05-31 10:26:19.310196",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "epayment_instruments_timeseries": {
        "name": "epayment_instruments_timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/epayment_instruments_timeseries.parquet",
        "data_as_of": "2024-07",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "variable"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "charge_f2f",
            "charge_online",
            "cheque",
            "credit_f2f",
            "credit_online",
            "debit_f2f",
            "debit_online",
            "emoney",
            "recession"
          ]
        }
      },
      "epayment_instruments_timeseries_callout": {
        "name": "epayment_instruments_timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/epayment_instruments_timeseries_callout.parquet",
        "data_as_of": "2024-07",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "variable",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      },
      "epayment_systems_timeseries": {
        "name": "epayment_systems_timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/epayment_systems_timeseries.parquet",
        "data_as_of": "2024-07",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "variable"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "dd",
            "fpx",
            "ibg",
            "jompay",
            "rentas",
            "rpp",
            "recession"
          ]
        }
      },
      "epayment_systems_timeseries_callout": {
        "name": "epayment_systems_timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/epayment_systems_timeseries_callout.parquet",
        "data_as_of": "2024-07",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "variable",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      },
      "epayment_channels_timeseries": {
        "name": "epayment_channels_timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/epayment_channels_timeseries.parquet",
        "data_as_of": "2024-07",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "variable"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "atm_cwd",
            "atm_fin",
            "internet_corp",
            "internet_indiv",
            "mobile",
            "recession"
          ]
        }
      },
      "epayment_channels_timeseries_callout": {
        "name": "epayment_channels_timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/epayment_channels_timeseries_callout.parquet",
        "data_as_of": "2024-07",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "variable",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "exchange_rates",
    "data_last_updated": "2025-07-27 04:00",
    "data_next_update": "2025-07-28 04:00",
    "route": "/dashboard/exchange-rates,/ms-MY/dashboard/exchange-rates",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2025-07-27 00:14:50.986953",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/er_timeseries.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "currency0",
            "currency1",
            "currency2",
            "currency3",
            "currency4",
            "currency5",
            "currency6",
            "currency7",
            "currency8",
            "currency9",
            "currency10",
            "currency11",
            "currency12",
            "currency13",
            "currency14",
            "currency15",
            "currency16",
            "currency17",
            "currency18",
            "currency19",
            "currency20",
            "currency21",
            "currency22",
            "currency23",
            "currency24"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/er_timeseries_callout.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "callout",
            "country_en",
            "country_bm",
            "tooltip_unit",
            "chart_flag"
          ]
        }
      },
      "bar_chart": {
        "name": "bar_chart",
        "chart_type": "bar_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/er_barchart.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "period"
          ],
          "rename_cols": {
            "country": "x",
            "pct_change": "y"
          },
          "x": "x",
          "y": [
            "y"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "formal_wages",
    "data_last_updated": "2025-04-29 12:00",
    "data_next_update": "2025-07-28 12:00",
    "route": "/dashboard/formal-sector-wages,/ms-MY/dashboard/formal-sector-wages",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "bar_bracket": {
        "name": "bar_bracket",
        "chart_type": "bar_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/labour_formalwages_snapshot_bracket.parquet",
        "data_as_of": "2024-Q4",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "date"
          ],
          "rename_cols": {
            "bracket": "x",
            "n_people": "y"
          },
          "x": "x",
          "y": [
            "y"
          ]
        }
      },
      "bar_percentile": {
        "name": "bar_percentile",
        "chart_type": "bar_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/labour_formalwages_snapshot_percentile.parquet",
        "data_as_of": "2024-Q4",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "date"
          ],
          "rename_cols": {
            "percentile": "x",
            "salary": "y"
          },
          "x": "x",
          "y": [
            "y"
          ]
        }
      },
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/labour_formalwages_timeseries_state.parquet",
        "data_as_of": "2024-Q4",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "state"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "salary"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/labour_formalwages_timeseries_state_callout.parquet",
        "data_as_of": "2024-Q4",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "state"
          ],
          "value_columns": [
            "salary"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "gdp",
    "data_last_updated": "2025-05-16 12:00",
    "data_next_update": "2025-08-15 12:00",
    "route": "/dashboard/gdp,/ms-MY/dashboard/gdp",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2025-05-16 12:05:20.416016",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/gdp_timeseries.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "overall",
            "supply_agri",
            "supply_mining",
            "supply_manufacturing",
            "supply_construction",
            "supply_services",
            "supply_import_duties",
            "demand_c",
            "demand_g",
            "demand_i",
            "demand_x",
            "demand_m",
            "demand_nx",
            "demand_inventory",
            "recession"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/gdp_timeseries_callout.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "callout"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "hies",
    "data_last_updated": "2023-07-28 12:00",
    "data_next_update": "2025-08-29 12:00",
    "route": "/dashboard/household-income-expenditure,/ms-MY/dashboard/household-income-expenditure",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "",
    "required_params": [],
    "optional_params": [
      "state"
    ],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/hies_timeseries.parquet",
        "data_as_of": "2022-12-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "median",
            "mean",
            "gini"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/hies_timeseries_callout.parquet",
        "data_as_of": "2022-12-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "variable"
          ],
          "value_columns": [
            "latest",
            "cagr"
          ]
        }
      },
      "choropleth_state": {
        "name": "choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/hies_choropleth_state.parquet",
        "data_as_of": "2022-12-31 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "income_mean",
            "income_median",
            "expenditure_mean",
            "gini",
            "poverty",
            "poverty_relative",
            "access_water",
            "access_electricity"
          ]
        }
      },
      "choropleth_district": {
        "name": "choropleth_district",
        "chart_type": "choropleth_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/hies_choropleth_district.parquet",
        "data_as_of": "2022-12-31 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "district",
          "y": [
            "income_mean",
            "income_median",
            "expenditure_mean",
            "gini",
            "poverty",
            "poverty_relative",
            "access_water",
            "access_electricity"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "homepage",
    "data_last_updated": "2025-07-27 00:01",
    "route": "/,/ms-MY/",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2025-07-27 00:16:12.807453",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/homepage_timeseries.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x",
            "views_7dma": "line_views",
            "downloads_7dma": "line_downloads",
            "users_7dma": "line_users"
          },
          "value_columns": [
            "x",
            "views",
            "line_views",
            "downloads",
            "line_downloads",
            "users",
            "line_users"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/homepage_timeseries_callout.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "callout1",
            "callout2"
          ]
        }
      },
      "table_summary": {
        "name": "table_summary",
        "chart_type": "metrics_table",
        "chart_source": "https://storage.data.gov.my/dashboards/homepage_top.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "time_period",
            "chart_type"
          ],
          "rename_cols": {
            "agency": "agency_abbr"
          },
          "value_columns": [
            "id",
            "name_en",
            "name_bm",
            "agency_abbr",
            "count"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "household_debt",
    "data_last_updated": "2025-05-31 15:00",
    "data_next_update": "2025-06-30 15:00",
    "route": "/dashboard/household-debt,/ms-MY/dashboard/household-debt",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2025-05-31 08:40:44.228650",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "http://storage.data.gov.my/dashboards/hhdebt_timeseries.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "transaction",
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "credit_card",
            "vehicles_passenger",
            "property_residental",
            "personal_total",
            "securities",
            "recession"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "http://storage.data.gov.my/dashboards/hhdebt_timeseries_callout.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "transaction",
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "house_prices",
    "data_last_updated": "2024-04-30 12:00",
    "data_next_update": "2024-07-30 12:00",
    "route": "/dashboard/house-prices,/ms-MY/dashboard/house-prices",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "",
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "houseprice_timeseries": {
        "name": "houseprice_timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/houseprice_timeseries.parquet",
        "data_as_of": "2024-Q1",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "all",
            "terrace",
            "high_rise",
            "detached",
            "semi_detached"
          ]
        }
      },
      "houseprice_timeseries_callout": {
        "name": "houseprice_timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/houseprice_timeseries_callout.parquet",
        "data_as_of": "2024-Q1",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      },
      "houseprice_choropleth_state": {
        "name": "houseprice_choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "http://storage.data.gov.my/dashboards/houseprice_choropleth.parquet",
        "data_as_of": "2024-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "all",
            "terrace",
            "high_rise",
            "detached",
            "semi_detached"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "iip",
    "data_last_updated": "2025-05-16 12:00",
    "data_next_update": "2025-08-15 12:00",
    "route": "/dashboard/international-investment-position,/ms-MY/dashboard/international-investment-position",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2025-05-16 11:58:23.104319",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/iip_timeseries.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "direct_equity",
            "direct_debt",
            "direct_total",
            "porfolio_equity",
            "portfolio_debt",
            "portfolio_total",
            "derivatives",
            "other",
            "reserve",
            "total",
            "recession"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/iip_timeseries_callout.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "latest",
            "change"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "immigration",
    "data_last_updated": "2023-06-01 23:59",
    "route": "/dashboard/passport-and-passes,/ms-MY/dashboard/passport-and-passes",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "0",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "choropleth": {
        "name": "choropleth",
        "chart_type": "choropleth_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/immigration_choropleth_state.parquet",
        "data_as_of": "2023-05-23 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "value"
          ],
          "keys": [
            "variable"
          ]
        }
      },
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/immigration_timeseries.parquet",
        "data_as_of": "2023-05-23 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "period"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "passport",
            "expatriate",
            "visit",
            "entry"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/immigration_timeseries_callout.parquet",
        "data_as_of": "2023-05-23 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart",
            "variable"
          ],
          "value_columns": [
            "value"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "immigration_country",
    "data_last_updated": "2023-08-01 23:59",
    "route": "/dashboard/immigration-not,/ms-MY/dashboard/immigration-not",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "",
    "required_params": [
      "country"
    ],
    "optional_params": [],
    "charts": {
      "query_values": {
        "name": "query_values",
        "chart_type": "query_values",
        "chart_source": "https://storage.data.gov.my/dashboards/immigration_timeseries.parquet",
        "data_as_of": "2023-07-31 23:59",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "flat": true,
          "columns": [
            "country"
          ],
          "sort_values": {
            "by": [
              "country"
            ],
            "ascending": [
              true
            ]
          }
        }
      },
      "timeseries_country": {
        "name": "timeseries_country",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/immigration_timeseries.parquet",
        "data_as_of": "2023-07-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "country"
        ],
        "variables": {
          "keys": [
            "country",
            "frequency"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "in",
            "out",
            "net"
          ]
        }
      },
      "timeseries_country_callout": {
        "name": "timeseries_country_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/immigration_timeseries_callout.parquet",
        "data_as_of": "2023-07-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "country"
        ],
        "variables": {
          "keys": [
            "country"
          ],
          "value_columns": [
            "in",
            "out",
            "net"
          ]
        }
      },
      "timeseries_demography": {
        "name": "timeseries_demography",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/immigration_demog_timeseries.parquet",
        "data_as_of": "2023-07-31 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "frequency"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "female",
            "male",
            "baby",
            "child",
            "teenager",
            "adult_young",
            "adult",
            "elderly"
          ]
        }
      },
      "timeseries_demography_callout": {
        "name": "timeseries_demography_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/immigration_demog_timeseries_callout.parquet",
        "data_as_of": "2023-07-31 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "daily",
            "yearly"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "immigration_temp",
    "data_last_updated": "2024-11-25 16:00",
    "data_next_update": "2024-12-25 16:00",
    "route": "/dashboard/immigration,/ms-MY/dashboard/immigration",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "query_values": {
        "name": "query_values",
        "chart_type": "query_values",
        "chart_source": "https://storage.data.gov.my/dashboards/immigration_timeseries_new.parquet",
        "data_as_of": "2024-10-31 23:59",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "flat": true,
          "columns": [
            "country"
          ],
          "sort_values": {
            "by": [
              "country"
            ],
            "ascending": [
              true
            ]
          }
        }
      },
      "timeseries_country": {
        "name": "timeseries_country",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/immigration_timeseries_new.parquet",
        "data_as_of": "2024-10-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "country"
        ],
        "variables": {
          "keys": [
            "country",
            "frequency"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "in"
          ]
        }
      },
      "timeseries_country_callout": {
        "name": "timeseries_country_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/immigration_timeseries_new_callout.parquet",
        "data_as_of": "2024-10-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "country"
        ],
        "variables": {
          "keys": [
            "country"
          ],
          "value_columns": [
            "in"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "income_tax",
    "data_last_updated": "2023-08-01 16:00",
    "data_next_update": "2024-08-01 16:00",
    "route": "/dashboard/income-taxation,/ms-MY/dashboard/income-taxation",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "stacked_bar": {
        "name": "stacked_bar",
        "chart_type": "bar_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/incometax_stackedbar.parquet",
        "data_as_of": "2022-12-31 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "x": "x",
          "y": [
            "direct_iita",
            "direct_pita",
            "direct_cita",
            "direct_subtotal"
          ]
        }
      },
      "query_values": {
        "name": "query_values",
        "chart_type": "query_values",
        "chart_source": "https://storage.data.gov.my/dashboards/incometax_interactive.parquet",
        "data_as_of": "2023-07-31 23:59",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "columns": [
            "variable",
            "state",
            "type",
            "age"
          ]
        }
      },
      "tax_percentile": {
        "name": "tax_percentile",
        "chart_type": "metrics_table",
        "chart_source": "https://storage.data.gov.my/dashboards/incometax_interactive.parquet",
        "data_as_of": "2023-07-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "variable",
          "state",
          "type",
          "age"
        ],
        "variables": {
          "keys": [
            "variable",
            "state",
            "type",
            "age"
          ],
          "value_columns": [
            "value",
            "percentile",
            "n_group",
            "n_more_than"
          ]
        }
      },
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/incometax_timeseries.parquet",
        "data_as_of": "2023-07-31 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "total",
            "solo",
            "joint",
            "zero"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/incometax_timeseries_callout.parquet",
        "data_as_of": "2023-07-31 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "industrial_production",
    "data_last_updated": "2025-07-11 12:00",
    "data_next_update": "2025-08-07 12:00",
    "route": "/dashboard/industrial-production,/ms-MY/dashboard/industrial-production",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/ipi_timeseries.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "overall",
            "mining",
            "mfg",
            "electric",
            "mfg_food",
            "mfg_textiles",
            "mfg_wood",
            "mfg_petroleum",
            "mfg_metal",
            "mfg_electric",
            "mfg_transport",
            "recession"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/ipi_timeseries_callout.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "callout"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "interest_rates",
    "data_last_updated": "2025-05-31 15:00",
    "data_next_update": "2025-06-30 15:00",
    "manual_trigger": "",
    "route": "/dashboard/interest-rates,/ms-MY/dashboard/interest-rates",
    "sites": [
      "datagovmy"
    ],
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/interestrates_timeseries.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "deposit_fixed_12mo",
            "deposit_saving",
            "base",
            "walr",
            "recession"
          ]
        }
      },
      "timeseries_opr": {
        "name": "timeseries_opr",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/interestrates_timeseries_opr.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "opr"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/interestrates_timeseries_callout.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "callout"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "international_reserves",
    "data_last_updated": "2025-03-24 15:00",
    "data_next_update": "2025-04-15 15:00",
    "route": "/dashboard/international-reserves,/ms-MY/dashboard/international-reserves",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2025-04-08 10:02:01.091102",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/intlreserves_timeseries.parquet",
        "data_as_of": "2025-03-15 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "reserves_usd",
            "import_months",
            "ed_scale",
            "recession"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/intlreserves_timeseries_callout.parquet",
        "data_as_of": "2025-03-15 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "callout"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "internet_penetration",
    "data_last_updated": "2023-09-06 23:59",
    "route": "/dashboard/internet-penetration,/ms-MY/dashboard/internet-penetration",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "0",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "traffic_timeseries": {
        "name": "traffic_timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "http://storage.data.gov.my/dashboards/internet_traffic_timeseries.parquet",
        "data_as_of": "2023-09-06 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "traffic_fbb",
            "traffic_mbb"
          ]
        }
      },
      "traffic_timeseries_callout": {
        "name": "traffic_timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/internet_traffic_timeseries_callout.parquet",
        "data_as_of": "2023-09-06 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      },
      "penetration_timeseries": {
        "name": "penetration_timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "http://storage.data.gov.my/dashboards/internet_penetration_timeseries.parquet",
        "data_as_of": "2023-09-06 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "fbb",
            "mbb",
            "mc",
            "ptv"
          ]
        }
      },
      "penetration_timeseries_callout": {
        "name": "penetration_timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/internet_penetration_timeseries_callout.parquet",
        "data_as_of": "2023-09-06 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "latest",
            "rate"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "ipr",
    "data_last_updated": "2023-06-01 23:59",
    "route": "/dashboard/ipr,/ms-MY/dashboard/ipr",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2",
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/ipr_timeseries.parquet",
        "data_as_of": "2023-05-16 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "frequency"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "ikhsan",
            "insan",
            "intan",
            "overall"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/ipr_timeseries_callout.parquet",
        "data_as_of": "2023-05-16 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart",
            "variable"
          ],
          "value_columns": [
            "value"
          ]
        }
      },
      "choropleth": {
        "name": "choropleth",
        "chart_type": "choropleth_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/ipr_choropleth_state.parquet",
        "data_as_of": "2023-05-16 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "value"
          ],
          "keys": [
            "variable"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "kawasanku_admin",
    "data_last_updated": "2023-08-30 12:00",
    "route": "/dashboard/kawasanku,/ms-MY/dashboard/kawasanku",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "1",
    "required_params": [],
    "optional_params": [
      "area",
      "area_type"
    ],
    "charts": {
      "jitter_chart": {
        "name": "jitter_chart",
        "chart_type": "jitter_chart",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_admin_jitter.parquet",
        "data_as_of": "2022-11-25 23:59",
        "api_type": "dynamic",
        "api_params": [
          "area_type"
        ],
        "variables": {
          "keys": "area_type",
          "id": "area",
          "columns": {
            "geography": [
              "total_area",
              "max_elevation",
              "ruggedness",
              "watercover",
              "treecover",
              "treeloss",
              "nightlights"
            ],
            "population": [
              "population_density",
              "female_male",
              "household_size",
              "birth_rate",
              "death_rate",
              "dep_young",
              "dep_old"
            ],
            "economy": [
              "income_mean",
              "expenditure_mean",
              "gini",
              "poverty",
              "labour_urate",
              "labour_prate",
              "agegroup_working"
            ],
            "public_services": [
              "electricity",
              "water",
              "hospital",
              "clinic",
              "school",
              "police_fire",
              "grocery"
            ]
          },
          "tooltip": true
        }
      },
      "pyramid_data": {
        "name": "pyramid_data",
        "chart_type": "pyramid_chart",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_admin_pyramid.parquet",
        "data_as_of": "2023-06-26 23:59",
        "api_type": "dynamic",
        "api_params": [
          "area_type",
          "area"
        ],
        "variables": {
          "keys": [
            "area_type",
            "area"
          ]
        }
      },
      "bar_chart": {
        "name": "bar_chart",
        "chart_type": "bar_meter",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_admin_barmeter.parquet",
        "data_as_of": "2022-11-25 23:59",
        "api_type": "dynamic",
        "api_params": [
          "area_type",
          "area"
        ],
        "variables": {
          "axis_values": [
            {
              "variable": "value"
            }
          ],
          "keys": [
            "area_type",
            "area",
            "chart"
          ]
        }
      },
      "bar_chart_callout": {
        "name": "bar_chart_callout",
        "chart_type": "bar_meter",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_admin_barmeter_callout.parquet",
        "data_as_of": "2022-11-25 23:59",
        "api_type": "dynamic",
        "api_params": [
          "area_type",
          "area"
        ],
        "variables": {
          "axis_values": [
            {
              "variable": "value"
            }
          ],
          "keys": [
            "area_type",
            "area",
            "chart"
          ]
        }
      },
      "query_values": {
        "name": "query_values",
        "data_as_of": "2022-11-25 23:59",
        "chart_type": "query_values",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_admin_barmeter_callout.parquet",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "flat": true,
          "columns": [
            "area_type",
            "area"
          ],
          "sort_values": {
            "by": [
              "area_type",
              "area"
            ],
            "ascending": [
              true,
              true
            ]
          }
        }
      },
      "choropleth_parlimen": {
        "name": "choropleth_parlimen",
        "chart_type": "choropleth_chart",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_electoral_choropleth_parlimen.parquet",
        "data_as_of": "2020-01-01 00:00",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "y": [
            "poverty",
            "electricity",
            "water",
            "income_mean",
            "expenditure_mean",
            "gini",
            "population_density",
            "max_elevation",
            "treecover",
            "nightlights"
          ],
          "x": "parlimen"
        }
      },
      "choropleth_dun": {
        "name": "choropleth_dun",
        "chart_type": "choropleth_chart",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_electoral_choropleth_dun.parquet",
        "data_as_of": "2020-01-01 00:00",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "y": [
            "poverty",
            "electricity",
            "water",
            "income_mean",
            "expenditure_mean",
            "gini",
            "population_density",
            "max_elevation",
            "treecover",
            "nightlights"
          ],
          "x": "dun"
        }
      }
    }
  },
  {
    "dashboard_name": "kawasanku_electoral",
    "data_last_updated": "2023-08-30 12:00",
    "route": "/dashboard/kawasanku,/ms-MY/dashboard/kawasanku",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "1",
    "required_params": [],
    "optional_params": [
      "area",
      "area_type"
    ],
    "charts": {
      "jitter_chart": {
        "name": "jitter_chart",
        "chart_type": "jitter_chart",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_electoral_jitter.parquet",
        "data_as_of": "2022-11-25 23:59",
        "api_type": "dynamic",
        "api_params": [
          "area_type"
        ],
        "variables": {
          "keys": "area_type",
          "id": "area",
          "columns": {
            "geography": [
              "total_area",
              "max_elevation",
              "ruggedness",
              "watercover",
              "treecover",
              "treeloss",
              "nightlights"
            ],
            "population": [
              "population_density",
              "female_male",
              "household_size",
              "birth_rate",
              "death_rate",
              "dep_young",
              "dep_old"
            ],
            "economy": [
              "income_mean",
              "expenditure_mean",
              "gini",
              "poverty",
              "labour_urate",
              "labour_prate",
              "agegroup_working"
            ],
            "public_services": [
              "electricity",
              "water",
              "hospital",
              "clinic",
              "school",
              "police_fire",
              "grocery"
            ]
          },
          "tooltip": true
        }
      },
      "pyramid_data": {
        "name": "pyramid_data",
        "chart_type": "pyramid_chart",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_electoral_pyramid.parquet",
        "data_as_of": "2023-06-26 23:59",
        "api_type": "dynamic",
        "api_params": [
          "area_type",
          "area"
        ],
        "variables": {
          "keys": [
            "area_type",
            "area"
          ]
        }
      },
      "bar_chart": {
        "name": "bar_chart",
        "chart_type": "bar_meter",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_electoral_barmeter.parquet?ignoreCache=1",
        "data_as_of": "2022-11-25 23:59",
        "api_type": "dynamic",
        "api_params": [
          "area"
        ],
        "variables": {
          "axis_values": [
            {
              "variable": "value"
            }
          ],
          "keys": [
            "area",
            "chart"
          ]
        }
      },
      "bar_chart_callout": {
        "name": "bar_chart_callout",
        "chart_type": "bar_meter",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_electoral_barmeter_callout.parquet?ignoreCache=1",
        "data_as_of": "2022-11-25 23:59",
        "api_type": "dynamic",
        "api_params": [
          "area"
        ],
        "variables": {
          "axis_values": [
            {
              "variable": "value"
            }
          ],
          "keys": [
            "area",
            "chart"
          ]
        }
      },
      "query_values": {
        "name": "query_values",
        "data_as_of": "2022-11-25 23:59",
        "chart_type": "query_values",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_electoral_barmeter_callout.parquet?ignoreCache=1",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "flat": true,
          "columns": [
            "area_type",
            "area"
          ],
          "sort_values": {
            "by": [
              "area_type",
              "area"
            ],
            "ascending": [
              true,
              true
            ]
          }
        }
      },
      "choropleth_parlimen": {
        "name": "choropleth_parlimen",
        "chart_type": "choropleth_chart",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_electoral_choropleth_parlimen.parquet",
        "data_as_of": "2020-01-01 00:00",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "y": [
            "poverty",
            "electricity",
            "water",
            "income_mean",
            "expenditure_mean",
            "gini",
            "population_density",
            "max_elevation",
            "treecover",
            "nightlights"
          ],
          "x": "parlimen"
        }
      },
      "choropleth_dun": {
        "name": "choropleth_dun",
        "chart_type": "choropleth_chart",
        "chart_source": "http://storage.dosm.gov.my.s3.ap-southeast-1.amazonaws.com/dashboards/kawasanku_electoral_choropleth_dun.parquet",
        "data_as_of": "2020-01-01 00:00",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "y": [
            "poverty",
            "electricity",
            "water",
            "income_mean",
            "expenditure_mean",
            "gini",
            "population_density",
            "max_elevation",
            "treecover",
            "nightlights"
          ],
          "x": "dun"
        }
      }
    }
  },
  {
    "dashboard_name": "kkmnow_homepage",
    "data_last_updated": "2025-07-27 00:01",
    "route": "/,/ms-MY/",
    "sites": [
      "kkmnow"
    ],
    "manual_trigger": "2025-07-27 10:57:38.338678",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "keystats": {
        "name": "keystats",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/kkmnow_homepage_keystats.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "callout",
            "data_as_of"
          ]
        }
      },
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/kkmnow_homepage_timeseries.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x",
            "views_7dma": "line_views",
            "downloads_7dma": "line_downloads"
          },
          "value_columns": [
            "x",
            "views",
            "line_views",
            "downloads",
            "line_downloads"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/kkmnow_homepage_timeseries_callout.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "callout1",
            "callout2"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "ktmb",
    "data_last_updated": "2023-05-31 23:59",
    "route": "/dashboard/ktmb,/ms-MY/dashboard/ktmb",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "1",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/ktmb_timeseries.parquet",
        "data_as_of": "2023-05-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "service",
          "origin",
          "destination"
        ],
        "variables": {
          "keys": [
            "service",
            "origin",
            "destination",
            "frequency"
          ],
          "rename_cols": {
            "date": "x",
            "passengers": "y"
          },
          "value_columns": [
            "x",
            "y"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/ktmb_timeseries_callout.parquet",
        "data_as_of": "2023-05-31 23:59",
        "api_type": "dynamic",
        "api_params": [
          "service",
          "origin",
          "destination"
        ],
        "variables": {
          "keys": [
            "service",
            "origin",
            "destination",
            "frequency"
          ],
          "value_columns": [
            "passengers"
          ]
        }
      },
      "query_values": {
        "name": "query_values",
        "chart_type": "query_values",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/ktmb_timeseries.parquet",
        "data_as_of": "2023-05-31 23:59",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "columns": [
            "service",
            "origin",
            "destination"
          ],
          "sort_values": {
            "by": [
              "service",
              "origin",
              "destination"
            ],
            "ascending": [
              true,
              true,
              true
            ]
          }
        }
      }
    }
  },
  {
    "dashboard_name": "labour",
    "manual_trigger": "2024-02-09 12:48:39.645687",
    "data_last_updated": "2025-07-10 12:00",
    "data_next_update": "2025-08-11 12:00",
    "route": "/dashboard/labour-market,/ms-MY/dashboard/labour-market",
    "sites": [
      "opendosm"
    ],
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/labour_timeseries.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x",
            "u_rate": "unemployment_rate",
            "p_rate": "labour_force_participation",
            "under_rate": "under_employment_rate",
            "ep_ratio": "employment_population_ratio",
            "unemployed": "unemployed_persons",
            "own_account": "own_account_workers",
            "outside": "outside_labour_force"
          },
          "value_columns": [
            "x",
            "unemployment_rate",
            "labour_force_participation",
            "under_employment_rate",
            "employment_population_ratio",
            "unemployed_persons",
            "own_account_workers",
            "outside_labour_force"
          ]
        }
      },
      "bar_chart": {
        "name": "bar_chart",
        "chart_type": "bar_meter",
        "chart_source": "https://storage.dosm.gov.my/dashboards/labour_barmeter.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "axis_values": [
            {
              "variable": "value"
            }
          ],
          "keys": [
            "chart"
          ],
          "sub_keys": true
        }
      },
      "choropleth_malaysia": {
        "name": "choropleth_malaysia",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/labour_choropleth.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "income_mean",
            "labour_urate",
            "labour_prate",
            "agegroup_working"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/labour_timeseries_callout.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "callout1"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "labour_productivity",
    "manual_trigger": "2025-02-23 00:49:34.633346",
    "data_last_updated": "2025-05-22 12:00",
    "data_next_update": "2025-08-21 12:00",
    "route": "/dashboard/labour-productivity,/ms-MY/dashboard/labour-productivity",
    "sites": [
      "opendosm"
    ],
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/productivity_timeseries.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "overall",
            "agriculture",
            "mining",
            "mfg",
            "construction",
            "sevices",
            "recession"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/productivity_timeseries_callout.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "lifetables",
    "data_last_updated": "2024-09-30 12:00",
    "data_next_update": "2025-09-30 12:00",
    "route": "/dashboard/life-expectancy,/ms-MY/dashboard/life-expectancy",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2024-09-30 13:30:29.493354",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/lifetables_timeseries.parquet",
        "data_as_of": "2024",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "sex"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "overall",
            "bumi",
            "bumi_malay",
            "bumi_other",
            "chinese",
            "indian",
            "noncitizen"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/lifetables_timeseries_callout.parquet",
        "data_as_of": "2024",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "overall",
            "male",
            "female"
          ]
        }
      },
      "heatmap": {
        "name": "heatmap",
        "chart_type": "heatmap_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/lifetables_heattable.parquet",
        "data_as_of": "2024",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "x": "group",
          "y": "year",
          "z": "value"
        }
      },
      "choropleth_state": {
        "name": "choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/lifetables_state.parquet",
        "data_as_of": "2024",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "overall",
            "male",
            "female",
            "gap_sex"
          ]
        }
      },
      "choropleth_district": {
        "name": "choropleth_district",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/lifetables_district.parquet",
        "data_as_of": "2024",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "district",
          "y": [
            "overall",
            "male",
            "female",
            "gap_sex"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "manufacturing_statistics",
    "data_last_updated": "2025-07-11 12:00",
    "data_next_update": "2025-08-07 12:00",
    "route": "/dashboard/manufacturing-statistics,/ms-MY/dashboard/manufacturing-statistics",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://s3.ap-southeast-1.amazonaws.com/storage.dosm.gov.my/dashboards/mfg_timeseries.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "sales",
            "employees",
            "wages",
            "recession"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://s3.ap-southeast-1.amazonaws.com/storage.dosm.gov.my/dashboards/mfg_timeseries_callout.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "money_measures",
    "data_last_updated": "2025-05-31 15:00",
    "data_next_update": "2025-06-30 15:00",
    "route": "/dashboard/money-supply,/ms-MY/dashboard/money-supply",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2024-03-02 12:32:47.176033",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/moneymeasures_timeseries.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "m1_total",
            "m2_total",
            "m3_total",
            "m1_currency",
            "m1_deposit_demand",
            "m2_deposit_saving",
            "m2_deposit_fixed",
            "m2_nid",
            "m2_repo",
            "m2_deposit_fx",
            "m2_deposit_other",
            "m3_deposit_other",
            "recession"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/moneymeasures_timeseries_callout.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "callout"
          ]
        }
      },
      "table_summary": {
        "name": "table_summary",
        "chart_type": "snapshot_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/moneymeasures_table_summary.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "main_key": "type",
          "replace_word": "",
          "data": {
            "data": [
              "m1",
              "m2",
              "m3"
            ]
          }
        }
      }
    }
  },
  {
    "dashboard_name": "name_popularity",
    "data_last_updated": "2023-07-26 23:59",
    "route": "/dashboard/name-popularity,/ms-MY/dashboard/name-popularity",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "top_names": {
        "name": "top_names",
        "chart_type": "metrics_table",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/name_popularity_top.parquet",
        "data_as_of": "2023-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "decade",
            "ethnicity"
          ],
          "value_columns": [
            "name_first",
            "sex",
            "count"
          ]
        }
      },
      "year_dropdown": {
        "name": "year_dropdown",
        "chart_type": "query_values",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/name_popularity_top.parquet",
        "data_as_of": "2023-07-26 23:59",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "columns": [
            "decade"
          ]
        }
      },
      "ethnicity_dropdown": {
        "name": "ethnicity_dropdown",
        "chart_type": "query_values",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/name_popularity_top.parquet",
        "data_as_of": "2023-07-26 23:59",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "columns": [
            "ethnicity"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "odin",
    "data_last_updated": "2024-09-28 05:28",
    "route": "/odin-self-assessment",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "",
    "required_params": [],
    "optional_params": [
      "lang"
    ],
    "charts": {
      "bar_chart": {
        "name": "bar_chart",
        "chart_type": "bar_chart",
        "chart_source": "https://storage.dosm.gov.my/benchmarking/odin_2024_bar.parquet",
        "data_as_of": "2024-09-28 05:28",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "category",
            "subcategory",
            "indicator",
            "element"
          ],
          "x": "subelement",
          "y": [
            "overall",
            "maximum"
          ]
        }
      },
      "keystats": {
        "name": "keystats",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/benchmarking/odin_2024_bar.parquet",
        "data_as_of": "2024-09-28 05:28",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "category",
            "subcategory",
            "indicator",
            "element"
          ],
          "value_columns": [
            "overall",
            "maximum"
          ]
        }
      },
      "table": {
        "name": "table",
        "chart_type": "metrics_table",
        "chart_source": "https://storage.dosm.gov.my/benchmarking/odin_2024_table.parquet",
        "data_as_of": "2024-09-28 05:28",
        "api_type": "dynamic",
        "api_params": [
          "lang"
        ],
        "variables": {
          "keys": [
            "lang",
            "category",
            "subcategory",
            "indicator",
            "element"
          ],
          "value_columns": [
            "subelement",
            "score",
            "justification"
          ]
        }
      },
      "links": {
        "name": "links",
        "chart_type": "metrics_table",
        "chart_source": "https://storage.dosm.gov.my/benchmarking/odin_2024_links.parquet",
        "data_as_of": "2024-09-28 05:28",
        "api_type": "dynamic",
        "api_params": [
          "lang"
        ],
        "variables": {
          "keys": [
            "lang",
            "category",
            "subcategory",
            "indicator"
          ],
          "value_columns": [
            "link_order",
            "link_title",
            "url"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "opendosm_homepage",
    "data_last_updated": "2025-07-27 00:01",
    "route": "/,/ms-MY/",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2025-07-27 00:16:12.809450",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "keystats": {
        "name": "keystats",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/homepage_keystats.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "callout",
            "data_as_of"
          ]
        }
      },
      "table_summary": {
        "name": "table_summary",
        "chart_type": "metrics_table",
        "chart_source": "https://storage.dosm.gov.my/dashboards/homepage_top.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "time_period"
          ],
          "rename_cols": {
            "agency": "agency_abbr"
          },
          "value_columns": [
            "id",
            "name_en",
            "name_bm",
            "agency_abbr",
            "count"
          ]
        }
      },
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/homepage_timeseries.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x",
            "views_7dma": "line_views",
            "downloads_7dma": "line_downloads",
            "users_7dma": "line_users"
          },
          "value_columns": [
            "x",
            "views",
            "line_views",
            "downloads",
            "line_downloads",
            "users",
            "line_users"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/homepage_timeseries_callout.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart"
          ],
          "value_columns": [
            "callout1",
            "callout2"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "orang_asli",
    "data_last_updated": "2023-06-24 23:59",
    "route": "/dashboard/orang-asli,/ms-MY/dashboard/orang-asli",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "choropleth_state": {
        "name": "choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/orang_asli_state.parquet",
        "data_as_of": "2023-06-24 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "population",
            "population_prop"
          ]
        }
      },
      "choropleth_district": {
        "name": "choropleth_district",
        "chart_type": "choropleth_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/orang_asli_district.parquet",
        "data_as_of": "2023-06-24 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "district",
          "y": [
            "population",
            "population_prop"
          ]
        }
      },
      "query_values": {
        "name": "query_values",
        "chart_type": "query_values",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/orang_asli_village.parquet",
        "data_as_of": "2023-06-24 23:59",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "flat": true,
          "columns": [
            "village",
            "district",
            "state",
            "slug"
          ]
        }
      },
      "village_data": {
        "name": "village_data",
        "chart_type": "metrics_table",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/orang_asli_village.parquet",
        "data_as_of": "2023-06-24 23:59",
        "api_type": "dynamic",
        "api_params": [
          "slug"
        ],
        "variables": {
          "keys": [
            "slug"
          ],
          "value_columns": [
            "village",
            "state",
            "district",
            "population",
            "lat",
            "lon"
          ]
        }
      },
      "village_barmeter": {
        "name": "village_barmeter",
        "data_as_of": "2023-06-26 23:59",
        "chart_type": "bar_meter",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/orang_asli_village_barmeter.parquet",
        "api_type": "dynamic",
        "api_params": [
          "slug"
        ],
        "variables": {
          "axis_values": [
            {
              "variable": "value"
            }
          ],
          "keys": [
            "slug",
            "chart"
          ]
        }
      },
      "pyramid_data": {
        "name": "pyramid_data",
        "chart_type": "pyramid_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/orang_asli_village_pyramid.parquet",
        "data_as_of": "2023-06-26 23:59",
        "api_type": "dynamic",
        "api_params": [
          "slug"
        ],
        "variables": {
          "keys": [
            "slug"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "organ_donation",
    "data_last_updated": "2025-07-27 09:00",
    "data_next_update": "2025-07-28 09:00",
    "route": "/dashboard/organ-donation,/ms-MY/dashboard/organ-donation",
    "sites": [
      "kkmnow"
    ],
    "manual_trigger": "2023-11-22 06:53:16.73864",
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "barchart_age": {
        "name": "barchart_age",
        "chart_type": "bar_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/organ_barchart_age.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "period"
          ],
          "rename_cols": {
            "age_group": "x",
            "new_donors": "y"
          },
          "x": "x",
          "y": [
            "y"
          ]
        }
      },
      "barchart_time": {
        "name": "barchart_time",
        "chart_type": "bar_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/organ_barchart_time.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "type"
          ],
          "rename_cols": {
            "period": "x",
            "new_donors": "y"
          },
          "x": "x",
          "y": [
            "y"
          ]
        }
      },
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/organ_timeseries.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "frequency"
          ],
          "rename_cols": {
            "date": "x",
            "daily": "y"
          },
          "value_columns": [
            "x",
            "y"
          ]
        }
      },
      "choropleth_malaysia": {
        "name": "choropleth_malaysia",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/organ_choropleth_msia.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "perc"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "padu_tracker",
    "data_last_updated": "2024-01-01 23:59",
    "route": "/dashboard/padu-tracker,/ms-MY/dashboard/padu-tracker",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "1",
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/padu_timeseries.parquet",
        "data_as_of": "2024-01-01 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "activations",
            "submissions"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/padu_timeseries_callout.parquet",
        "data_as_of": "2024-01-01 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart"
          ],
          "value_columns": [
            "cumul",
            "daily",
            "rate"
          ]
        }
      },
      "choropleth_state": {
        "name": "choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/padu_choropleth_state.parquet",
        "data_as_of": "2024-01-01 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "activations",
            "submissions"
          ]
        }
      },
      "heatmap": {
        "name": "heatmap",
        "chart_type": "heatmap_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/padu_heattable.parquet",
        "data_as_of": "2024-01-01 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "variable"
          ],
          "x": "group",
          "y": "age",
          "z": "value"
        }
      }
    }
  },
  {
    "dashboard_name": "peka_b40",
    "data_last_updated": "2025-07-27 09:00",
    "data_next_update": "2025-07-28 09:00",
    "route": "/dashboard/peka-b40,/ms-MY/dashboard/peka-b40",
    "sites": [
      "kkmnow"
    ],
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "manual_trigger": "2023-11-22 06:53:16.74445",
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/pekab40_timeseries.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "frequency"
          ],
          "rename_cols": {
            "date": "x",
            "daily": "y"
          },
          "value_columns": [
            "x",
            "y"
          ]
        }
      },
      "choropleth_malaysia": {
        "name": "choropleth_malaysia",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/pekab40_choropleth_msia.parquet",
        "data_as_of": "2025-07-26 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "perc"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "perkeso",
    "data_last_updated": "2023-09-10 09:00",
    "route": "/dashboard/jobless-claims,/ms-MY/dashboard/jobless-claims",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2",
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/joblessclaims_timeseries.parquet",
        "data_as_of": "2023-09-09 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "frequency"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "losses"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/joblessclaims_timeseries_callout.parquet",
        "data_as_of": "2023-09-09 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state"
          ],
          "value_columns": [
            "growth_mom",
            "growth_yoy"
          ]
        }
      },
      "pyramid_data": {
        "name": "pyramid_data",
        "chart_type": "pyramid_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/joblessclaims_pyramid.parquet",
        "data_as_of": "2023-09-09 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state"
          ]
        }
      },
      "barmeter": {
        "name": "barmeter",
        "chart_type": "bar_meter",
        "chart_source": "https://storage.data.gov.my/dashboards/joblessclaims_barmeter.parquet",
        "data_as_of": "2023-09-09 23:59",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "axis_values": [
            {
              "variable": "losses"
            }
          ],
          "keys": [
            "state",
            "chart"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "population",
    "data_last_updated": "2024-10-17 12:00",
    "data_next_update": "2025-12-31 12:00",
    "route": "/dashboard/population,/ms-MY/dashboard/population",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "1",
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "population_timeseries": {
        "name": "population_timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/population_timeseries.parquet",
        "data_as_of": "2024",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "population"
          ]
        }
      },
      "population_timeseries_callout": {
        "name": "population_timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/population_timeseries_callout.parquet",
        "data_as_of": "2024",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart_type"
          ],
          "value_columns": [
            "population"
          ]
        }
      },
      "vitalstats_timeseries": {
        "name": "vitalstats_timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/population_vitalstats_timeseries.parquet",
        "data_as_of": "2023",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "births_live",
            "births_still",
            "deaths",
            "deaths_infant",
            "deaths_maternal",
            "deaths_neonatal",
            "deaths_perinatal",
            "deaths_toddler",
            "deaths_under_five",
            "fertility",
            "natural_increase"
          ]
        }
      },
      "vitalstats_timeseries_callout": {
        "name": "vitalstats_timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/population_vitalstats_timeseries_callout.parquet",
        "data_as_of": "2023",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "poverty",
    "data_last_updated": "2023-07-27 23:59",
    "route": "/dashboard/poverty,/ms-MY/dashboard/poverty",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "1",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/poverty_timeseries.parquet",
        "data_as_of": "2023-07-27 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "poor",
            "hardcore_poor"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/poverty_timeseries_callout.parquet",
        "data_as_of": "2023-07-27 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart",
            "variable"
          ],
          "value_columns": [
            "value"
          ]
        }
      },
      "choropleth_state": {
        "name": "choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/poverty_state.parquet",
        "data_as_of": "2023-07-27 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "poor",
            "hardcore_poor",
            "poor_capita",
            "hardcore_poor_capita"
          ]
        }
      },
      "choropleth_district": {
        "name": "choropleth_district",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/poverty_district.parquet",
        "data_as_of": "2023-07-27 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "district",
          "y": [
            "poor",
            "hardcore_poor",
            "poor_capita",
            "hardcore_poor_capita"
          ]
        }
      },
      "heatmap": {
        "name": "heatmap",
        "chart_type": "heatmap_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/poverty_heattable.parquet",
        "data_as_of": "2023-07-27 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "metric"
          ],
          "x": "ethnicity",
          "y": "state",
          "z": "value"
        }
      }
    }
  },
  {
    "dashboard_name": "producer_price_index",
    "data_last_updated": "2025-06-26 12:00",
    "data_next_update": "2025-07-28 12:00",
    "route": "/dashboard/producer-prices,/ms-MY/dashboard/producer-prices",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2025-02-27 21:12:50.270416",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/ppi_main_timeseries.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "overall",
            "agriculture",
            "mining",
            "manufacturing",
            "electricity",
            "water",
            "recession"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/ppi_main_timeseries_callout.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "callout"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "public_transport",
    "data_last_updated": "2025-07-12 12:00",
    "data_next_update": "2025-08-12 12:00",
    "route": "/dashboard/public-transportation,/ms-MY/dashboard/public-transportation",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2025-07-15 08:28:53.488414",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/public_transport_timeseries.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "frequency"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "bus_rkl",
            "bus_rkn",
            "bus_rpn",
            "lrt_ampang",
            "mrt_kajang",
            "lrt_kj",
            "monorail",
            "mrt_pjy",
            "ets",
            "intercity",
            "komuter_utara",
            "komuter",
            "bus",
            "rail",
            "tebrau",
            "overall"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/public_transport_timeseries_callout.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart",
            "variable"
          ],
          "value_columns": [
            "value"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "reserves",
    "data_last_updated": "2025-05-31 15:00",
    "data_next_update": "2025-06-30 15:00",
    "route": "/dashboard/reserve-money,/ms-MY/dashboard/reserve-money",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2025-05-31 08:40:21.400022",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/reserves_timeseries.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "total",
            "currency",
            "reserves_required",
            "reserves_excess",
            "net_claims_gov",
            "claims_gov",
            "deposits_gov",
            "claims_private",
            "external",
            "others",
            "recession"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/reserves_timeseries_callout.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "callout"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "sekolahku",
    "data_last_updated": "2023-06-01 23:59",
    "route": "/dashboard/sekolahku,/ms-MY/dashboard/sekolahku",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "query_values": {
        "name": "query_values",
        "data_as_of": "2023-06-01 23:59",
        "chart_type": "query_values",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/sekolahku_school_info.parquet",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "flat": true,
          "columns": [
            "code",
            "school",
            "postcode",
            "state"
          ],
          "sort_values": {
            "by": [
              "code"
            ],
            "ascending": [
              true
            ]
          }
        }
      },
      "sekolahku_info": {
        "name": "sekolahku_info",
        "data_as_of": "2023-06-01 23:59",
        "chart_type": "custom_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/sekolahku_school_info.parquet",
        "api_type": "dynamic",
        "api_params": [
          "code"
        ],
        "variables": {
          "keys": [
            "code"
          ],
          "value_columns": [
            "code",
            "school",
            "state",
            "ppd",
            "city",
            "postcode",
            "lat",
            "lon",
            "strata",
            "type",
            "level",
            "funding_status",
            "students",
            "teachers"
          ]
        }
      },
      "sekolahku_barmeter": {
        "name": "sekolahku_barmeter",
        "data_as_of": "2023-06-01 23:59",
        "chart_type": "bar_meter",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/sekolahku_barmeter.parquet",
        "api_type": "dynamic",
        "api_params": [
          "code"
        ],
        "variables": {
          "axis_values": [
            {
              "variable": "value"
            }
          ],
          "keys": [
            "code",
            "use_as",
            "chart"
          ]
        }
      },
      "bellcurve_linechart": {
        "name": "bellcurve_linechart",
        "data_as_of": "2023-06-01 23:59",
        "chart_type": "line_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/sekolahku_bellcurve_curve.parquet",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "keys": [
            "state",
            "level",
            "chart"
          ],
          "x": "x",
          "y": [
            "y"
          ]
        }
      },
      "bellcurve_callout": {
        "name": "bellcurve_callout",
        "data_as_of": "2023-06-01 23:59",
        "chart_type": "custom_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/sekolahku_bellcurve_callout.parquet",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "keys": [
            "state",
            "level",
            "chart"
          ],
          "value_columns": [
            "callout"
          ]
        }
      },
      "bellcurve_school": {
        "name": "bellcurve_school",
        "data_as_of": "2023-06-01 23:59",
        "chart_type": "custom_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/sekolahku_bellcurve_school.parquet",
        "api_type": "dynamic",
        "api_params": [
          "code"
        ],
        "variables": {
          "keys": [
            "code"
          ],
          "value_columns": [
            "students",
            "st_ratio",
            "max_ethnic",
            "closest_school_dist",
            "household_income",
            "gpa"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "services_ppi",
    "data_last_updated": "2025-05-08 12:00",
    "data_next_update": "2025-08-06 12:00",
    "route": "/dashboard/services-producer-prices,/ms-MY/dashboard/services-producer-prices",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2025-05-12 16:18:40.263018",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/sppi_timeseries.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "total",
            "infocomm",
            "transport",
            "accom",
            "arts",
            "professional",
            "health",
            "education",
            "realestate",
            "recession"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/sppi_timeseries_callout.parquet",
        "data_as_of": "2025-Q1",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "service_statistics",
    "data_last_updated": "2024-11-07 12:00",
    "data_next_update": "2025-02-12 12:00",
    "route": "/dashboard/services-statistics,/ms-MY/dashboard/services-statistics",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/services_timeseries.parquet",
        "data_as_of": "2024-Q3",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "sector",
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "revenue",
            "employees",
            "wages",
            "recession"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/services_timeseries_callout.parquet",
        "data_as_of": "2024-Q3",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "sector",
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "trade",
    "manual_trigger": "",
    "data_last_updated": "2025-04-28 12:00",
    "data_next_update": "2025-05-28 12:00",
    "route": "/dashboard/external-trade,/ms-MY/dashboard/external-trade",
    "sites": [
      "opendosm"
    ],
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/trade_timeseries.parquet",
        "data_as_of": "2025-04",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "balance",
            "exports",
            "imports",
            "total",
            "recession"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/trade_timeseries_callout.parquet",
        "data_as_of": "2025-03",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "latest"
          ]
        }
      },
      "indices_timeseries": {
        "name": "indices_timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/trade_indices_timeseries.parquet",
        "data_as_of": "2025-03",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "variable",
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "overall",
            "food",
            "beverage_tobacco",
            "crude",
            "fuels",
            "oils",
            "chemicals",
            "mfg",
            "machinery",
            "misc_mfg",
            "misc_trnsc",
            "recession"
          ]
        }
      },
      "indices_timeseries_callout": {
        "name": "indices_timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "http://storage.dosm.gov.my/dashboards/trade_indices_timeseries_callout.parquet",
        "data_as_of": "2025-03",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "variable",
            "chart"
          ],
          "value_columns": [
            "growth_yoy",
            "index"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "unhcr",
    "data_last_updated": "2023-06-01 23:59",
    "route": "/dashboard/refugee-situation,/ms-MY/dashboard/refugee-situation",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/unhcr_timeseries.parquet",
        "data_as_of": "2023-05-23 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "overall",
            "arrivals",
            "registrations",
            "resettlements"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/unhcr_timeseries_callout.parquet",
        "data_as_of": "2023-05-23 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart",
            "variable"
          ],
          "value_columns": [
            "value"
          ]
        }
      },
      "choropleth": {
        "name": "choropleth",
        "chart_type": "choropleth_chart",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/unhcr_choropleth_state.parquet",
        "data_as_of": "2023-05-23 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "value"
          ],
          "keys": [
            "variable"
          ]
        }
      },
      "barmeter": {
        "name": "barmeter",
        "chart_type": "bar_meter",
        "chart_source": "https://dgmy-public-dashboards.s3.ap-southeast-1.amazonaws.com/unhcr_barmeter.parquet",
        "data_as_of": "2023-06-24 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "axis_values": [
            {
              "variable": "value"
            }
          ],
          "keys": [
            "use_as",
            "chart"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "vehicle_registrations",
    "data_last_updated": "2025-07-11 16:13",
    "data_next_update": "2025-08-11 16:00",
    "route": "/dashboard/vehicle-registrations,/ms-MY/dashboard/vehicle-registrations",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "2025-07-11 16:04:21.889053",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "query_values": {
        "name": "query_values",
        "chart_type": "query_values",
        "chart_source": "https://storage.data.gov.my/dashboards/vehicles_timeseries_fuel.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "columns": [
            "type"
          ]
        }
      },
      "vehicles_timeseries_fuel": {
        "name": "vehicles_timeseries_fuel",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/vehicles_timeseries_fuel.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "dynamic",
        "api_params": [
          "type"
        ],
        "variables": {
          "keys": [
            "type",
            "frequency"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "diesel",
            "electric",
            "greendiesel",
            "hybrid",
            "other",
            "petrol"
          ]
        }
      },
      "vehicles_timeseries_fuel_callout": {
        "name": "vehicles_timeseries_fuel_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/vehicles_timeseries_fuel_callout.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "dynamic",
        "api_params": [
          "type"
        ],
        "variables": {
          "keys": [
            "type",
            "fuel"
          ],
          "value_columns": [
            "latest",
            "alltime"
          ]
        }
      },
      "vehicles_timeseries_type": {
        "name": "vehicles_timeseries_type",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/vehicles_timeseries_type.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "frequency"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "bus",
            "car",
            "lorry",
            "motorcycle",
            "other",
            "van"
          ]
        }
      },
      "vehicles_timeseries_type_callout": {
        "name": "vehicles_timeseries_type_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/vehicles_timeseries_type_callout.parquet",
        "data_as_of": "2025-06-30 23:59",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "value_columns": [
            "latest",
            "alltime"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "weather_and_climate",
    "data_last_updated": "2023-06-30 12:00",
    "route": "/dashboard/weather-and-climate,/ms-MY/dashboard/weather-and-climate",
    "sites": [
      "datagovmy"
    ],
    "manual_trigger": "",
    "required_params": [
      "station"
    ],
    "optional_params": [],
    "charts": {
      "query_values": {
        "name": "query_values",
        "data_as_of": "2022-12-31 23:59",
        "chart_type": "query_values",
        "chart_source": "https://storage.data.gov.my/dashboards/weather_station.parquet",
        "api_type": "dynamic",
        "api_params": [],
        "variables": {
          "flat": true,
          "columns": [
            "station",
            "lat",
            "lon",
            "slug"
          ]
        }
      },
      "timeseries": {
        "name": "timeseries",
        "data_as_of": "2022-12-31 23:59",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/weather_station_timeseries.parquet",
        "api_type": "dynamic",
        "api_params": [
          "station"
        ],
        "variables": {
          "keys": [
            "station",
            "frequency"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "rainfall",
            "temperature"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "data_as_of": "2022-12-31 23:59",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.data.gov.my/dashboards/weather_station_timeseries_callout.parquet",
        "api_type": "dynamic",
        "api_params": [
          "station"
        ],
        "variables": {
          "keys": [
            "station"
          ],
          "value_columns": [
            "rainfall",
            "temperature"
          ]
        }
      }
    }
  },
  {
    "dashboard_name": "wellbeing",
    "data_last_updated": "2023-12-01 12:00",
    "data_next_update": "2024-12-05 12:00",
    "route": "/dashboard/wellbeing,/ms-MY/dashboard/wellbeing",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "",
    "required_params": [
      "state"
    ],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/wellbeing_state_timeseries.parquet",
        "data_as_of": "2022",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "overall",
            "economy",
            "economy_transport",
            "economy_comms",
            "economy_educ",
            "economy_income",
            "economy_work",
            "social",
            "social_housing",
            "social_entertainment",
            "social_safety",
            "social_participation",
            "social_governance",
            "social_culture",
            "social_health",
            "social_environment",
            "social_family"
          ]
        }
      },
      "timeseries_callout": {
        "name": "timeseries_callout",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/wellbeing_state_timeseries_callout.parquet",
        "data_as_of": "2022",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state",
            "chart"
          ],
          "value_columns": [
            "index",
            "growth_yoy"
          ]
        }
      },
      "choropleth_state": {
        "name": "choropleth_state",
        "chart_type": "choropleth_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/wellbeing_state_choropleth.parquet",
        "data_as_of": "2022",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "x": "state",
          "y": [
            "overall",
            "economy",
            "economy_transport",
            "economy_comms",
            "economy_educ",
            "economy_income",
            "economy_work",
            "social",
            "social_housing",
            "social_entertainment",
            "social_safety",
            "social_participation",
            "social_governance",
            "social_culture",
            "social_health",
            "social_environment",
            "social_family"
          ]
        }
      },
      "heatmap": {
        "name": "heatmap",
        "chart_type": "heatmap_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/wellbeing_state_heattable.parquet",
        "data_as_of": "2022",
        "api_type": "dynamic",
        "api_params": [
          "state"
        ],
        "variables": {
          "keys": [
            "state"
          ],
          "x": "component",
          "y": "year",
          "z": "index"
        }
      }
    }
  },
  {
    "dashboard_name": "wholesale_retail_trade",
    "data_last_updated": "2025-07-14 12:00",
    "data_next_update": "2025-08-08 12:00",
    "route": "/dashboard/wholesale-retail-trade,/ms-MY/dashboard/wholesale-retail-trade",
    "sites": [
      "opendosm"
    ],
    "manual_trigger": "2024-02-21 10:53:21.853909",
    "required_params": [],
    "optional_params": [],
    "charts": {
      "timeseries": {
        "name": "timeseries",
        "chart_type": "timeseries_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/iowrt_timeseries.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type"
          ],
          "rename_cols": {
            "date": "x"
          },
          "value_columns": [
            "x",
            "total",
            "wholesale",
            "retail",
            "motor",
            "recession"
          ]
        }
      },
      "statistics": {
        "name": "statistics",
        "chart_type": "custom_chart",
        "chart_source": "https://storage.dosm.gov.my/dashboards/iowrt_timeseries_callout.parquet",
        "data_as_of": "2025-05",
        "api_type": "static",
        "api_params": [],
        "variables": {
          "keys": [
            "chart_type",
            "chart"
          ],
          "value_columns": [
            "callout"
          ]
        }
      }
    }
  }
];
