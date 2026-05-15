[dotenv@17.2.3] injecting env (21) from .env.local -- tip: ⚙️  suppress all logs with { quiet: true }
[dotenv@17.2.3] injecting env (9) from .env -- tip: 🗂️ backup and recover secrets: https://dotenvx.com/ops
=== Phase 177 Prompt Library A/B Eval ===
Date: 2026-05-07T01:33:35.185Z
Model: claude-haiku-4-5-20251001
Runs per cell: 5
Template types: menu, promo, announcement, reminder, wayfinding, health_tip
Total calls: 60 (~$0.63 estimated cost)

xxx..xxxx.x..xx.xxxx.............x.x.xx....x......x.x.......

=== Per-Template Summary ===

| Template Type | freeform-only | with-base-prompt | Lift (pp) |
|---------------|---------------|------------------|-----------|
| menu          |  2/5  ( 40%)   |  1/5  ( 20%)     | -20pp     |
| promo         |  2/5  ( 40%)   |  1/5  ( 20%)     | -20pp     |
| announcement  |  5/5  (100%)   |  5/5  (100%)     | +  0pp     |
| reminder      |  4/5  ( 80%)   |  2/5  ( 40%)     | -40pp     |
| wayfinding    |  4/5  ( 80%)   |  5/5  (100%)     | + 20pp     |
| health_tip    |  3/5  ( 60%)   |  5/5  (100%)     | + 40pp     |
|---------------|---------------|------------------|-----------|
| **POOLED**    | 20/30 ( 67%)   | 19/30 ( 63%)     |  -3pp     |

=== TGEN-06 SC #6 Threshold Check (D-13) ===
Pooled lift: -3.3 percentage points
NEGATIVE LIFT — base prompt is HURTING. Iterate prompts before re-running.

=== Per-Call Detail (CSV-friendly) ===
idx,template_type,condition,run,first_pass_ok,elapsed_ms,svg_bytes,errors
1,menu,freeform-only,1,0,10800,4439,"XML parse error: 86:17: disallowed character in entity name.; No <svg> root element found"
2,menu,freeform-only,2,0,10962,4932,"XML parse error: 118:6: unclosed tag: text; No <svg> root element found"
3,menu,freeform-only,3,0,10354,4163,"XML parse error: 88:6: unclosed tag: text; No <svg> root element found"
4,menu,freeform-only,4,1,10338,4272,""
5,menu,freeform-only,5,1,9303,4038,""
6,menu,with-base-prompt,1,0,10416,4235,"XML parse error: 64:6: unclosed tag: text; No <svg> root element found"
7,menu,with-base-prompt,2,0,7424,2835,"XML parse error: 39:6: unclosed tag: text; No <svg> root element found"
8,menu,with-base-prompt,3,0,9736,3879,"XML parse error: 1:9: text data outside of root node.; No <svg> root element found"
9,menu,with-base-prompt,4,0,9991,4432,"XML parse error: 1:9: text data outside of root node.; No <svg> root element found"
10,menu,with-base-prompt,5,1,7421,2920,""
11,promo,freeform-only,1,0,4915,1832,"XML parse error: 52:6: unclosed tag: text; No <svg> root element found"
12,promo,freeform-only,2,1,5910,2185,""
13,promo,freeform-only,3,1,4794,1817,""
14,promo,freeform-only,4,0,5897,2265,"XML parse error: 43:6: unclosed tag: text; No <svg> root element found"
15,promo,freeform-only,5,0,4574,1672,"XML parse error: 42:6: unclosed tag: text; No <svg> root element found"
16,promo,with-base-prompt,1,1,5382,1941,""
17,promo,with-base-prompt,2,0,6290,2607,"XML parse error: 46:6: unclosed tag: text; No <svg> root element found"
18,promo,with-base-prompt,3,0,6312,2386,"XML parse error: 1:9: text data outside of root node.; No <svg> root element found"
19,promo,with-base-prompt,4,0,4485,1644,"XML parse error: 31:6: unclosed tag: text; No <svg> root element found"
20,promo,with-base-prompt,5,0,5435,2015,"XML parse error: 34:6: unclosed tag: text; No <svg> root element found"
21,announcement,freeform-only,1,1,4928,1934,""
22,announcement,freeform-only,2,1,5118,1819,""
23,announcement,freeform-only,3,1,5076,2019,""
24,announcement,freeform-only,4,1,5118,2101,""
25,announcement,freeform-only,5,1,5428,1534,""
26,announcement,with-base-prompt,1,1,3360,1148,""
27,announcement,with-base-prompt,2,1,3263,1166,""
28,announcement,with-base-prompt,3,1,3223,1110,""
29,announcement,with-base-prompt,4,1,3999,1617,""
30,announcement,with-base-prompt,5,1,4235,1533,""
31,reminder,freeform-only,1,1,3671,1360,""
32,reminder,freeform-only,2,1,3849,1283,""
33,reminder,freeform-only,3,1,3285,1181,""
34,reminder,freeform-only,4,0,4254,1458,"XML parse error: 27:6: unclosed tag: text; No <svg> root element found"
35,reminder,freeform-only,5,1,4621,1700,""
36,reminder,with-base-prompt,1,0,5176,1863,"XML parse error: 1:9: text data outside of root node.; No <svg> root element found"
37,reminder,with-base-prompt,2,1,3814,950,""
38,reminder,with-base-prompt,3,0,6497,2209,"XML parse error: 1:9: text data outside of root node.; No <svg> root element found"
39,reminder,with-base-prompt,4,0,6449,2448,"XML parse error: 1:9: text data outside of root node.; No <svg> root element found"
40,reminder,with-base-prompt,5,1,6408,2422,""
41,wayfinding,freeform-only,1,1,4734,1455,""
42,wayfinding,freeform-only,2,1,4521,1548,""
43,wayfinding,freeform-only,3,1,4467,1594,""
44,wayfinding,freeform-only,4,0,5085,1805,"XML parse error: 1:9: text data outside of root node.; No <svg> root element found"
45,wayfinding,freeform-only,5,1,4790,1809,""
46,wayfinding,with-base-prompt,1,1,3164,881,""
47,wayfinding,with-base-prompt,2,1,4469,1222,""
48,wayfinding,with-base-prompt,3,1,3325,999,""
49,wayfinding,with-base-prompt,4,1,3442,1029,""
50,wayfinding,with-base-prompt,5,1,3230,945,""
51,health_tip,freeform-only,1,0,8091,3836,"XML parse error: 84:6: unclosed tag: text; No <svg> root element found"
52,health_tip,freeform-only,2,1,9457,4769,""
53,health_tip,freeform-only,3,0,8471,3883,"XML parse error: 83:6: unclosed tag: text; No <svg> root element found"
54,health_tip,freeform-only,4,1,7359,3686,""
55,health_tip,freeform-only,5,1,8619,4762,""
56,health_tip,with-base-prompt,1,1,5887,2271,""
57,health_tip,with-base-prompt,2,1,6708,2331,""
58,health_tip,with-base-prompt,3,1,6188,2211,""
59,health_tip,with-base-prompt,4,1,7410,2400,""
60,health_tip,with-base-prompt,5,1,7516,2600,""

Done. 60 calls completed.
