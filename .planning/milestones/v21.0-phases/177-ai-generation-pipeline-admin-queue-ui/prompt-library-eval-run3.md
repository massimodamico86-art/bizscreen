[dotenv@17.2.3] injecting env (21) from .env.local -- tip: 🛠️  run anywhere with `dotenvx run -- yourcommand`
[dotenv@17.2.3] injecting env (9) from .env -- tip: 🔄 add secrets lifecycle management: https://dotenvx.com/ops
=== Phase 177 Prompt Library A/B Eval ===
Date: 2026-05-07T01:42:32.725Z
Model: claude-haiku-4-5-20251001
Runs per cell: 5
Template types: menu, promo, announcement, reminder, wayfinding, health_tip
Total calls: 60 (~$0.63 estimated cost)

.xx..xxxxxxxxx.xxx.x.................x...........xx.........

=== Per-Template Summary ===

| Template Type | freeform-only | with-base-prompt | Lift (pp) |
|---------------|---------------|------------------|-----------|
| menu          |  3/5  ( 60%)   |  0/5  (  0%)     | -60pp     |
| promo         |  1/5  ( 20%)   |  1/5  ( 20%)     | +  0pp     |
| announcement  |  5/5  (100%)   |  5/5  (100%)     | +  0pp     |
| reminder      |  5/5  (100%)   |  4/5  ( 80%)     | -20pp     |
| wayfinding    |  5/5  (100%)   |  4/5  ( 80%)     | -20pp     |
| health_tip    |  4/5  ( 80%)   |  5/5  (100%)     | + 20pp     |
|---------------|---------------|------------------|-----------|
| **POOLED**    | 23/30 ( 77%)   | 19/30 ( 63%)     | -13pp     |

=== TGEN-06 SC #6 Threshold Check (D-13) ===
Pooled lift: -13.3 percentage points
NEGATIVE LIFT — base prompt is HURTING. Iterate prompts before re-running.

=== Per-Call Detail (CSV-friendly) ===
idx,template_type,condition,run,first_pass_ok,elapsed_ms,svg_bytes,errors
1,menu,freeform-only,1,1,10243,4294,""
2,menu,freeform-only,2,0,9877,4124,"XML parse error: 96:6: unclosed tag: text; No <svg> root element found"
3,menu,freeform-only,3,0,10452,4525,"XML parse error: 101:6: unclosed tag: text; No <svg> root element found"
4,menu,freeform-only,4,1,13071,5634,""
5,menu,freeform-only,5,1,12544,4620,""
6,menu,with-base-prompt,1,0,6629,2675,"XML parse error: 46:6: unclosed tag: text; No <svg> root element found"
7,menu,with-base-prompt,2,0,8531,3427,"XML parse error: 48:6: unclosed tag: text; No <svg> root element found"
8,menu,with-base-prompt,3,0,8226,2936,"XML parse error: 61:6: unclosed tag: text; No <svg> root element found"
9,menu,with-base-prompt,4,0,9640,4350,"XML parse error: 62:6: unclosed tag: text; No <svg> root element found"
10,menu,with-base-prompt,5,0,7434,2832,"XML parse error: 43:6: unclosed tag: text; No <svg> root element found"
11,promo,freeform-only,1,0,4282,1741,"XML parse error: 43:6: unclosed tag: text; No <svg> root element found"
12,promo,freeform-only,2,0,5617,2281,"XML parse error: 48:6: unclosed tag: text; No <svg> root element found"
13,promo,freeform-only,3,0,6131,2426,"XML parse error: 50:6: unclosed tag: text; No <svg> root element found"
14,promo,freeform-only,4,0,5503,1806,"XML parse error: 34:6: unclosed tag: text; No <svg> root element found"
15,promo,freeform-only,5,1,4670,1524,""
16,promo,with-base-prompt,1,0,5260,2239,"XML parse error: 37:6: unclosed tag: text; No <svg> root element found"
17,promo,with-base-prompt,2,0,5127,1904,"XML parse error: 37:6: unclosed tag: text; No <svg> root element found"
18,promo,with-base-prompt,3,0,6384,2486,"XML parse error: 42:6: unclosed tag: text; No <svg> root element found"
19,promo,with-base-prompt,4,1,6497,2678,""
20,promo,with-base-prompt,5,0,6512,2387,"XML parse error: 46:6: unclosed tag: text; No <svg> root element found"
21,announcement,freeform-only,1,1,4028,1604,""
22,announcement,freeform-only,2,1,5018,1885,""
23,announcement,freeform-only,3,1,5387,2214,""
24,announcement,freeform-only,4,1,6042,1566,""
25,announcement,freeform-only,5,1,4220,1486,""
26,announcement,with-base-prompt,1,1,3430,1052,""
27,announcement,with-base-prompt,2,1,4036,1422,""
28,announcement,with-base-prompt,3,1,3058,1018,""
29,announcement,with-base-prompt,4,1,2976,1026,""
30,announcement,with-base-prompt,5,1,4162,1543,""
31,reminder,freeform-only,1,1,6074,2345,""
32,reminder,freeform-only,2,1,4181,1438,""
33,reminder,freeform-only,3,1,5081,1268,""
34,reminder,freeform-only,4,1,3848,1280,""
35,reminder,freeform-only,5,1,5473,1946,""
36,reminder,with-base-prompt,1,1,5493,2053,""
37,reminder,with-base-prompt,2,1,5288,1943,""
38,reminder,with-base-prompt,3,0,5955,2186,"XML parse error: 40:38: attribute without value.; No <svg> root element found"
39,reminder,with-base-prompt,4,1,5549,2009,""
40,reminder,with-base-prompt,5,1,5113,1816,""
41,wayfinding,freeform-only,1,1,5439,2055,""
42,wayfinding,freeform-only,2,1,6340,1384,""
43,wayfinding,freeform-only,3,1,3788,1286,""
44,wayfinding,freeform-only,4,1,4585,1698,""
45,wayfinding,freeform-only,5,1,5540,1983,""
46,wayfinding,with-base-prompt,1,1,3074,978,""
47,wayfinding,with-base-prompt,2,1,3108,922,""
48,wayfinding,with-base-prompt,3,1,3873,1190,""
49,wayfinding,with-base-prompt,4,1,4125,993,""
50,wayfinding,with-base-prompt,5,0,3953,1073,"XML parse error: 1:9: text data outside of root node.; No <svg> root element found"
51,health_tip,freeform-only,1,0,8356,4329,"XML parse error: 62:82: duplicate attribute: text-anchor.; No <svg> root element found"
52,health_tip,freeform-only,2,1,8459,4157,""
53,health_tip,freeform-only,3,1,6998,2669,""
54,health_tip,freeform-only,4,1,8368,4318,""
55,health_tip,freeform-only,5,1,8994,4720,""
56,health_tip,with-base-prompt,1,1,6869,2480,""
57,health_tip,with-base-prompt,2,1,6228,2197,""
58,health_tip,with-base-prompt,3,1,10676,2481,""
59,health_tip,with-base-prompt,4,1,8990,2214,""
60,health_tip,with-base-prompt,5,1,6956,2435,""

Done. 60 calls completed.
