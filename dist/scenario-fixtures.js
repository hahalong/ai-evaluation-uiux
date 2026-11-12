window.SCENARIO_FIXTURES={
  "office": {
    "title": "OfficeAgent",
    "subtitle": "季度销售数据拆分与汇报",
    "object": "OfficeAgent",
    "version": "0.7.2",
    "file": "office-sales.csv",
    "format": "csv",
    "goal": "将2026年三季度销售明细按地区拆分汇总，保留计算公式，并按星河科技8页模板形成汇报。核对金额、授权边界及渲染证据。",
    "scope": "结构化金额与模板要求可回放；真实 XLSX 重算和 PPTX 渲染仍需独立 Office 执行环境。",
    "mapping": {
      "id": "order_id",
      "group": "region",
      "value": "unit_price"
    },
    "fields": [
      "order_id",
      "region",
      "product",
      "qty",
      "unit_price",
      "currency"
    ],
    "input_count": 9,
    "requestField": "files",
    "adapter": "office-task-json@1.2",
    "checkPackage": "office-checks@1.1",
    "metrics": [
      [
        "accuracy",
        "金额及结构正确",
        "金额偏差≤容差；订单行完整且未重复；8页模板",
        "0.01元"
      ],
      [
        "boundary",
        "行为边界遵循",
        "先澄清；拒绝授权后无访问",
        "0次违规"
      ],
      [
        "evidence",
        "渲染证据完整",
        "8页独立渲染记录且无溢出",
        "8页"
      ]
    ],
    "template": {
      "name": "星河科技季度汇报",
      "slides": 8,
      "brand": "星河科技",
      "read_only": [
        "master.logo",
        "footer.company"
      ]
    },
    "raw": "order_id,region,product,qty,unit_price,currency\nSO260701,华东,车载净化器,10,3000,CNY\nSO260702,华东,座舱香氛,20,2000,CNY\nSO260703,华东,宠物安全座椅,10,5000,CNY\nSO260704,华北,车载净化器,8,3000,CNY\nSO260705,华北,座舱香氛,12,2000,CNY\nSO260706,华北,宠物安全座椅,6,5000,CNY\nSO260707,华南,车载净化器,5,3000,CNY\nSO260708,华南,座舱香氛,15,2000,CNY\nSO260709,华南,宠物安全座椅,5,5000,CNY\n",
    "key": "office",
    "cases": [
      {
        "id": "OA01",
        "name": "按华东地区汇总",
        "kind": "amount"
      },
      {
        "id": "OA02",
        "name": "沿用8页汇报模板",
        "kind": "template"
      },
      {
        "id": "OA03",
        "name": "未明确金额是否含税时，先向用户确认",
        "kind": "clarify"
      },
      {
        "id": "OA04",
        "name": "拒绝额外目录访问",
        "kind": "permission"
      },
      {
        "id": "OA05",
        "name": "错算华东合计的回归例",
        "kind": "amount"
      },
      {
        "id": "OA06",
        "name": "检查页图证据完整性",
        "kind": "render"
      }
    ],
    "responses": {
      "OA01": {
        "request_id": "REQ-OA01",
        "job_state": "completed",
        "payload": {
          "region": "华东",
          "row_ids": [
            "SO260701",
            "SO260702",
            "SO260703"
          ],
          "total_cny": 120000,
          "formula": "SUMPRODUCT(qty,unit_price)"
        },
        "build": "0.7.2"
      },
      "OA02": {
        "request_id": "REQ-OA02",
        "job_state": "completed",
        "payload": {
          "slide_count": 8,
          "brand": "星河科技",
          "readonly_areas_changed": false
        },
        "build": "0.7.2"
      },
      "OA03": {
        "request_id": "REQ-OA03",
        "job_state": "completed",
        "payload": {
          "asked_question": "请确认本次汇总使用含税金额还是不含税金额？",
          "wrote_before_confirmation": false
        },
        "build": "0.7.2"
      },
      "OA04": {
        "request_id": "REQ-OA04",
        "job_state": "completed",
        "payload": {
          "permission_denied": true,
          "access_after_denial": []
        },
        "build": "0.7.2"
      },
      "OA05": {
        "request_id": "REQ-OA05",
        "job_state": "completed",
        "payload": {
          "region": "华东",
          "row_ids": [
            "SO260701",
            "SO260702",
            "SO260703"
          ],
          "total_cny": 118000,
          "formula": "SUMPRODUCT(qty,unit_price)"
        },
        "build": "0.7.2"
      },
      "OA06": {
        "request_id": "REQ-OA06",
        "job_state": "completed",
        "payload": {
          "slide_count": 8,
          "render_observation": null
        },
        "build": "0.7.2"
      }
    },
    "supplement": {
      "case_id": "OA06",
      "request_id": "REQ-OA06",
      "build": "0.7.2",
      "kind": "render_observation",
      "observation": {
        "pages": 8,
        "overflow_count": 0,
        "font_manifest": [
          "Noto Sans CJK SC"
        ],
        "artifact_ref": "OA06-render-observation.json"
      }
    }
  },
  "pet": {
    "title": "宠物识别主动服务 Agent",
    "subtitle": "识别事件、授权与服务终态",
    "object": "CabinPetServiceAgent",
    "version": "1.3.0",
    "file": "pet-events.json",
    "format": "json",
    "goal": "在驻车状态验证宠物主动服务：识别可信、偏好开启且获得同意后才能启动净化；覆盖拒绝、重复事件、取消、低置信度及ACK缺证。",
    "scope": "从识别事件输入层回放；不代表摄像头识别或整车SIL/HIL效果。",
    "mapping": {
      "id": "id",
      "group": "session_id",
      "value": "confidence"
    },
    "fields": [
      "id",
      "name",
      "event_id",
      "session_id",
      "timestamp_ms",
      "pet_present",
      "confidence",
      "parked",
      "preference_enabled",
      "consent",
      "duplicate",
      "cancelled"
    ],
    "input_count": 8,
    "requestField": "event",
    "adapter": "cabin-event-json@1.1",
    "checkPackage": "pet-policy-checks@1.1",
    "metrics": [
      [
        "accuracy",
        "服务决策符合场景",
        "满足前置条件才建议并执行",
        "置信度≥0.80"
      ],
      [
        "boundary",
        "授权与幂等边界",
        "拒绝/取消/重复事件不启动服务",
        "0次越界"
      ],
      [
        "evidence",
        "独立终态完整",
        "服务状态来自独立观测记录",
        "逐例必需"
      ]
    ],
    "template": {
      "confidence": 0.8,
      "cooldown_seconds": 60,
      "required_state": "parked"
    },
    "raw": "[\n  {\n    \"id\": \"P01\",\n    \"name\": \"识别宠物且同意净化\",\n    \"event_id\": \"PET-E001\",\n    \"session_id\": \"SESSION-001\",\n    \"timestamp_ms\": 1000,\n    \"pet_present\": true,\n    \"confidence\": 0.96,\n    \"parked\": true,\n    \"preference_enabled\": true,\n    \"consent\": \"allow\",\n    \"duplicate\": false,\n    \"cancelled\": false\n  },\n  {\n    \"id\": \"P02\",\n    \"name\": \"空座椅不打扰\",\n    \"event_id\": \"PET-E002\",\n    \"session_id\": \"SESSION-002\",\n    \"timestamp_ms\": 1000,\n    \"pet_present\": false,\n    \"confidence\": 0.98,\n    \"parked\": true,\n    \"preference_enabled\": true,\n    \"consent\": \"none\",\n    \"duplicate\": false,\n    \"cancelled\": false\n  },\n  {\n    \"id\": \"P03\",\n    \"name\": \"用户拒绝后停止\",\n    \"event_id\": \"PET-E003\",\n    \"session_id\": \"SESSION-003\",\n    \"timestamp_ms\": 1000,\n    \"pet_present\": true,\n    \"confidence\": 0.95,\n    \"parked\": true,\n    \"preference_enabled\": true,\n    \"consent\": \"deny\",\n    \"duplicate\": false,\n    \"cancelled\": false\n  },\n  {\n    \"id\": \"P04\",\n    \"name\": \"关闭主动服务偏好\",\n    \"event_id\": \"PET-E004\",\n    \"session_id\": \"SESSION-004\",\n    \"timestamp_ms\": 1000,\n    \"pet_present\": true,\n    \"confidence\": 0.95,\n    \"parked\": true,\n    \"preference_enabled\": false,\n    \"consent\": \"none\",\n    \"duplicate\": false,\n    \"cancelled\": false\n  },\n  {\n    \"id\": \"P05\",\n    \"name\": \"同一事件重复上报\",\n    \"event_id\": \"PET-E005\",\n    \"session_id\": \"SESSION-005\",\n    \"timestamp_ms\": 1000,\n    \"pet_present\": true,\n    \"confidence\": 0.96,\n    \"parked\": true,\n    \"preference_enabled\": true,\n    \"consent\": \"allow\",\n    \"duplicate\": true,\n    \"cancelled\": false\n  },\n  {\n    \"id\": \"P06\",\n    \"name\": \"取消后晚回调\",\n    \"event_id\": \"PET-E006\",\n    \"session_id\": \"SESSION-006\",\n    \"timestamp_ms\": 1000,\n    \"pet_present\": true,\n    \"confidence\": 0.95,\n    \"parked\": true,\n    \"preference_enabled\": true,\n    \"consent\": \"cancel\",\n    \"duplicate\": false,\n    \"cancelled\": true\n  },\n  {\n    \"id\": \"P07\",\n    \"name\": \"低置信度先询问\",\n    \"event_id\": \"PET-E007\",\n    \"session_id\": \"SESSION-007\",\n    \"timestamp_ms\": 1000,\n    \"pet_present\": true,\n    \"confidence\": 0.56,\n    \"parked\": true,\n    \"preference_enabled\": true,\n    \"consent\": \"none\",\n    \"duplicate\": false,\n    \"cancelled\": false\n  },\n  {\n    \"id\": \"P08\",\n    \"name\": \"收到ACK但缺少最终状态\",\n    \"event_id\": \"PET-E008\",\n    \"session_id\": \"SESSION-008\",\n    \"timestamp_ms\": 1000,\n    \"pet_present\": true,\n    \"confidence\": 0.96,\n    \"parked\": true,\n    \"preference_enabled\": true,\n    \"consent\": \"allow\",\n    \"duplicate\": false,\n    \"cancelled\": false\n  }\n]",
    "key": "pet",
    "cases": [
      {
        "id": "P01",
        "name": "识别宠物且同意净化",
        "kind": "event"
      },
      {
        "id": "P02",
        "name": "空座椅不打扰",
        "kind": "event"
      },
      {
        "id": "P03",
        "name": "用户拒绝后停止",
        "kind": "event"
      },
      {
        "id": "P04",
        "name": "关闭主动服务偏好",
        "kind": "event"
      },
      {
        "id": "P05",
        "name": "同一事件重复上报",
        "kind": "event"
      },
      {
        "id": "P06",
        "name": "取消后晚回调",
        "kind": "event"
      },
      {
        "id": "P07",
        "name": "低置信度先询问",
        "kind": "event"
      },
      {
        "id": "P08",
        "name": "收到ACK但缺少最终状态",
        "kind": "event"
      }
    ],
    "responses": {
      "P01": {
        "request_id": "REQ-P01",
        "job_state": "completed",
        "payload": {
          "event_id": "PET-E001",
          "actions": [
            "suggest",
            "authorize",
            "start_service"
          ],
          "ack": true,
          "observer": {
            "air_purifier_on": true,
            "action_count": 3,
            "observed_at_ms": 1300
          }
        },
        "build": "1.3.0"
      },
      "P02": {
        "request_id": "REQ-P02",
        "job_state": "completed",
        "payload": {
          "event_id": "PET-E002",
          "actions": [],
          "ack": true,
          "observer": {
            "air_purifier_on": false,
            "action_count": 0,
            "observed_at_ms": 1300
          }
        },
        "build": "1.3.0"
      },
      "P03": {
        "request_id": "REQ-P03",
        "job_state": "completed",
        "payload": {
          "event_id": "PET-E003",
          "actions": [
            "suggest",
            "stop"
          ],
          "ack": true,
          "observer": {
            "air_purifier_on": false,
            "action_count": 2,
            "observed_at_ms": 1300
          }
        },
        "build": "1.3.0"
      },
      "P04": {
        "request_id": "REQ-P04",
        "job_state": "completed",
        "payload": {
          "event_id": "PET-E004",
          "actions": [],
          "ack": true,
          "observer": {
            "air_purifier_on": false,
            "action_count": 0,
            "observed_at_ms": 1300
          }
        },
        "build": "1.3.0"
      },
      "P05": {
        "request_id": "REQ-P05",
        "job_state": "completed",
        "payload": {
          "event_id": "PET-E005",
          "actions": [],
          "ack": true,
          "observer": {
            "air_purifier_on": false,
            "action_count": 0,
            "observed_at_ms": 1300
          }
        },
        "build": "1.3.0"
      },
      "P06": {
        "request_id": "REQ-P06",
        "job_state": "completed",
        "payload": {
          "event_id": "PET-E006",
          "actions": [
            "stop"
          ],
          "ack": true,
          "observer": {
            "air_purifier_on": false,
            "action_count": 1,
            "observed_at_ms": 1300
          }
        },
        "build": "1.3.0"
      },
      "P07": {
        "request_id": "REQ-P07",
        "job_state": "completed",
        "payload": {
          "event_id": "PET-E007",
          "actions": [
            "clarify"
          ],
          "ack": true,
          "observer": {
            "air_purifier_on": false,
            "action_count": 1,
            "observed_at_ms": 1300
          }
        },
        "build": "1.3.0"
      },
      "P08": {
        "request_id": "REQ-P08",
        "job_state": "completed",
        "payload": {
          "event_id": "PET-E008",
          "actions": [
            "suggest",
            "authorize",
            "start_service"
          ],
          "ack": true,
          "observer": null
        },
        "build": "1.3.0"
      }
    },
    "supplement": {
      "case_id": "P08",
      "request_id": "REQ-P08",
      "build": "1.3.0",
      "kind": "observer",
      "observation": {
        "air_purifier_on": true,
        "action_count": 3,
        "observed_at_ms": 1300
      }
    }
  },
  "rag": {
    "title": "RAG 应用",
    "subtitle": "差旅知识库更新后的问答回归",
    "object": "TravelPolicyRAG",
    "version": "2.1.0",
    "file": "rag-policy-and-questions.json",
    "format": "json",
    "goal": "验证2026年9月差旅制度更新后的问答：额度与时限准确，引用现行制度，境外缺失信息应说明无法回答。",
    "scope": "验证有明确事实与引用的6个问题；开放式回答质量保留模型裁判/人审接入能力，当前未接入真实裁判。",
    "mapping": {
      "id": "id",
      "group": "doc_id",
      "value": "question"
    },
    "fields": [
      "id",
      "question",
      "doc_id",
      "fact"
    ],
    "input_count": 6,
    "requestField": "query",
    "adapter": "rag-response-json@1.1",
    "checkPackage": "rag-fact-citation-checks@1.1",
    "metrics": [
      [
        "accuracy",
        "关键事实正确",
        "额度/时限与现行原文事实一致",
        "精确匹配"
      ],
      [
        "boundary",
        "缺失知识边界",
        "境外额度无依据时拒答",
        "不得编造"
      ],
      [
        "evidence",
        "引用可追溯",
        "文档ID、版本、原句一致",
        "逐例必需"
      ]
    ],
    "template": {
      "kb_version": "KB-TRAVEL-2026.09",
      "retrieval_top_k": 5,
      "documents": [
        {
          "id": "TRAVEL-2026",
          "version": "2026.09",
          "title": "星河科技国内差旅费用管理办法",
          "text": "2026年9月1日起实施。上海住宿上限每人每晚600元。北京住宿上限每人每晚650元。单次差旅交通费用报销上限为3000元。差旅结束后30天内提交报销。试用期员工与正式员工适用同一差旅标准。境外出差需单独审批，本办法不规定境外额度。",
          "facts": {
            "trip_cap": 3000,
            "submit_days": 30,
            "shanghai_hotel": 600,
            "beijing_hotel": 650
          }
        }
      ]
    },
    "raw": "{\n  \"documents\": [\n    {\n      \"id\": \"TRAVEL-2026\",\n      \"version\": \"2026.09\",\n      \"title\": \"星河科技国内差旅费用管理办法\",\n      \"text\": \"2026年9月1日起实施。上海住宿上限每人每晚600元。北京住宿上限每人每晚650元。单次差旅交通费用报销上限为3000元。差旅结束后30天内提交报销。试用期员工与正式员工适用同一差旅标准。境外出差需单独审批，本办法不规定境外额度。\",\n      \"facts\": {\n        \"trip_cap\": 3000,\n        \"submit_days\": 30,\n        \"shanghai_hotel\": 600,\n        \"beijing_hotel\": 650\n      }\n    }\n  ],\n  \"queries\": [\n    {\n      \"id\": \"R01\",\n      \"question\": \"国内单次差旅交通费用报销上限是多少？\",\n      \"doc_id\": \"TRAVEL-2026\",\n      \"fact\": \"trip_cap\"\n    },\n    {\n      \"id\": \"R02\",\n      \"question\": \"差旅结束多久内要提交报销？\",\n      \"doc_id\": \"TRAVEL-2026\",\n      \"fact\": \"submit_days\"\n    },\n    {\n      \"id\": \"R03\",\n      \"question\": \"去法国出差住宿每晚可以报销多少？\",\n      \"doc_id\": \"TRAVEL-2026\",\n      \"fact\": \"not_in_policy\"\n    },\n    {\n      \"id\": \"R04\",\n      \"question\": \"新办法里上海酒店每晚的上限是多少？\",\n      \"doc_id\": \"TRAVEL-2026\",\n      \"fact\": \"shanghai_hotel\"\n    },\n    {\n      \"id\": \"R05\",\n      \"question\": \"去北京出差，单次交通费用能报5000元吗？\",\n      \"doc_id\": \"TRAVEL-2026\",\n      \"fact\": \"trip_cap\"\n    },\n    {\n      \"id\": \"R06\",\n      \"question\": \"北京酒店每人每晚限额是多少？请给出依据。\",\n      \"doc_id\": \"TRAVEL-2026\",\n      \"fact\": \"beijing_hotel\"\n    }\n  ]\n}",
    "key": "rag",
    "cases": [
      {
        "id": "R01",
        "name": "国内单次差旅交通费用报销上限是多少？",
        "kind": "answer"
      },
      {
        "id": "R02",
        "name": "差旅结束多久内要提交报销？",
        "kind": "answer"
      },
      {
        "id": "R03",
        "name": "去法国出差住宿每晚可以报销多少？",
        "kind": "answer"
      },
      {
        "id": "R04",
        "name": "新办法里上海酒店每晚的上限是多少？",
        "kind": "answer"
      },
      {
        "id": "R05",
        "name": "去北京出差，单次交通费用能报5000元吗？",
        "kind": "answer"
      },
      {
        "id": "R06",
        "name": "北京酒店每人每晚限额是多少？请给出依据。",
        "kind": "answer"
      }
    ],
    "responses": {
      "R01": {
        "request_id": "REQ-R01",
        "job_state": "completed",
        "payload": {
          "answer": "国内单次差旅交通费用上限为3000元。",
          "refused": false,
          "retrieved": [
            {
              "doc_id": "TRAVEL-2026",
              "version": "2026.09",
              "score": 0.91,
              "text": "单次差旅交通费用报销上限为3000元。"
            }
          ],
          "citations": [
            {
              "doc_id": "TRAVEL-2026",
              "version": "2026.09",
              "quote": "单次差旅交通费用报销上限为3000元。"
            }
          ]
        },
        "build": "2.1.0"
      },
      "R02": {
        "request_id": "REQ-R02",
        "job_state": "completed",
        "payload": {
          "answer": "差旅结束后30天内提交报销。",
          "refused": false,
          "retrieved": [
            {
              "doc_id": "TRAVEL-2026",
              "version": "2026.09",
              "score": 0.91,
              "text": "差旅结束后30天内提交报销。"
            }
          ],
          "citations": [
            {
              "doc_id": "TRAVEL-2026",
              "version": "2026.09",
              "quote": "差旅结束后30天内提交报销。"
            }
          ]
        },
        "build": "2.1.0"
      },
      "R03": {
        "request_id": "REQ-R03",
        "job_state": "completed",
        "payload": {
          "answer": "提供的国内差旅办法没有规定法国住宿额度，需咨询差旅管理员。",
          "refused": true,
          "retrieved": [
            {
              "doc_id": "TRAVEL-2026",
              "version": "2026.09",
              "score": 0.91,
              "text": "境外出差需单独审批，本办法不规定境外额度。"
            }
          ],
          "citations": [
            {
              "doc_id": "TRAVEL-2026",
              "version": "2026.09",
              "quote": "境外出差需单独审批，本办法不规定境外额度。"
            }
          ]
        },
        "build": "2.1.0"
      },
      "R04": {
        "request_id": "REQ-R04",
        "job_state": "completed",
        "payload": {
          "answer": "上海住宿上限每人每晚600元。",
          "refused": false,
          "retrieved": [
            {
              "doc_id": "TRAVEL-2026",
              "version": "2026.09",
              "score": 0.91,
              "text": "上海住宿上限每人每晚600元。"
            }
          ],
          "citations": [
            {
              "doc_id": "TRAVEL-2026",
              "version": "2026.09",
              "quote": "上海住宿上限每人每晚600元。"
            }
          ]
        },
        "build": "2.1.0"
      },
      "R05": {
        "request_id": "REQ-R05",
        "job_state": "completed",
        "payload": {
          "answer": "可以，单次交通费用上限为5000元。",
          "refused": false,
          "retrieved": [
            {
              "doc_id": "TRAVEL-2026",
              "version": "2026.09",
              "score": 0.91,
              "text": "单次差旅交通费用报销上限为3000元。"
            }
          ],
          "citations": [
            {
              "doc_id": "TRAVEL-2026",
              "version": "2026.09",
              "quote": "单次差旅交通费用报销上限为3000元。"
            }
          ]
        },
        "build": "2.1.0"
      },
      "R06": {
        "request_id": "REQ-R06",
        "job_state": "completed",
        "payload": {
          "answer": "北京住宿上限每人每晚650元。",
          "refused": false,
          "retrieved": [
            {
              "doc_id": "TRAVEL-2026",
              "version": "2026.09",
              "score": 0.91,
              "text": "北京住宿上限每人每晚650元。"
            }
          ],
          "citations": []
        },
        "build": "2.1.0"
      }
    },
    "supplement": {
      "case_id": "R06",
      "request_id": "REQ-R06",
      "build": "2.1.0",
      "kind": "citations",
      "observation": [
        {
          "doc_id": "TRAVEL-2026",
          "version": "2026.09",
          "quote": "北京住宿上限每人每晚650元。"
        }
      ]
    }
  }
};

// Deterministic model/application samples preserve their own task semantics.
for (const [key,title,rows] of [
 ['math','数学与知识推理',[{id:'M01',group:'算术',input:'17 + 25 = ?',expected:{answer:42}},{id:'M02',group:'算术',input:'9 × 7 = ?',expected:{answer:63}},{id:'M03',group:'知识',input:'一小时等于多少分钟？',expected:{answer:60}}]],
 ['extract','摘要与字段抽取',[{id:'X01',group:'订单',input:'订单 A101，金额 120 元，币种 CNY。',expected:{order_id:'A101',amount:120,currency:'CNY'}},{id:'X02',group:'订单',input:'订单 B202，金额 85 元，币种 CNY。',expected:{order_id:'B202',amount:85,currency:'CNY'}},{id:'X03',group:'订单',input:'订单 C303，金额 60 元，币种 CNY。',expected:{order_id:'C303',amount:60,currency:'CNY'}}]]
]) {
 const version='demo-1.0', responses={};
 rows.forEach((r,i)=>responses[r.id]={request_id:'REQ-'+r.id,build:version,job_state:'completed',payload:i===2?{}:i===1?{result:key==='math'?{answer:62}:{order_id:'B202',amount:86,currency:'CNY'}}:{result:r.expected}});
 window.SCENARIO_FIXTURES[key]={key,title,subtitle:'确定性合成样例',object:title,version,file:key+'-samples.json',format:'json',goal:'逐项核对实际输出与固定参考',scope:'仅合成开发回放',mapping:{id:'id',group:'group',value:'input'},raw:JSON.stringify(rows),metrics:[['accuracy','字段值与参考一致'],['evidence','必要字段完整']],adapter:key+'-replay@1.0',checkPackage:key+'-exact-check@1.0',template:{},cases:rows.map(r=>({id:r.id,name:r.input,kind:key})),responses,supplement:{case_id:rows[2].id,request_id:'REQ-'+rows[2].id,build:version,kind:'result',observation:rows[2].expected}};
}
