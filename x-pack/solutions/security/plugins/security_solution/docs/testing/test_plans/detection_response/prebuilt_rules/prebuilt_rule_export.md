# Test plan: exporting prebuilt rules <!-- omit from toc -->

**Status**: `in progress`, matches [Milestone 3](https://github.com/elastic/kibana/issues/174168).

> [!TIP]
> If you're new to prebuilt rules, get started [here](./prebuilt_rules.md) and check an overview of the features of prebuilt rules in [this section](./prebuilt_rules_common_info.md#features).

## Summary <!-- omit from toc -->

This is a test plan for the workflows of:

- exporting single prebuilt rules from the Rule Details page
- exporting single prebuilt rules one-by-one from the Rule Management page
- exporting multiple prebuilt rules in bulk from the Rule Management page
- exporting a mixture of prebuilt and custom rules from the Rule Management page

where each prebuilt rule:

- can be an original (non-customized) prebuilt rule from Elastic, or
- can be a prebuilt rule customized by the user.

## Table of contents <!-- omit from toc -->

<!--
Please use the "Markdown All in One" VS Code extension to keep the TOC in sync with the text:
https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one
-->

- [Useful information](#useful-information)
  - [Tickets](#tickets)
  - [Terminology](#terminology)
- [Requirements](#requirements)
  - [Assumptions](#assumptions)
  - [Technical requirements](#technical-requirements)
  - [Product requirements](#product-requirements)
- [Scenarios](#scenarios)
  - [Core Functionality](#core-functionality)
    - [Scenario: Exporting prebuilt rule individually from rule details page](#scenario-exporting-prebuilt-rule-individually-from-rule-details-page)
    - [Scenario: Exporting custom rule individually from rule details page](#scenario-exporting-custom-rule-individually-from-rule-details-page)
    - [Scenario: Exporting prebuilt rule individually from rules management table](#scenario-exporting-prebuilt-rule-individually-from-rules-management-table)
    - [Scenario: Exporting custom rule individually from rules management table](#scenario-exporting-custom-rule-individually-from-rules-management-table)
    - [Scenario: Exporting prebuilt rules in bulk](#scenario-exporting-prebuilt-rules-in-bulk)
    - [Scenario: Exporting custom rules in bulk](#scenario-exporting-custom-rules-in-bulk)
    - [Scenario: Exporting both prebuilt and custom rules in bulk](#scenario-exporting-both-prebuilt-and-custom-rules-in-bulk)
  - [Error Handling](#error-handling)
    - [Scenario: Exporting beyond the export limit](#scenario-exporting-beyond-the-export-limit)
  - [Licensing](#licensing)
    - [Scenario: Exporting a mixture of prebuilt and custom rules via export API under insufficient license\*\*](#scenario-exporting-a-mixture-of-prebuilt-and-custom-rules-via-export-api-under-insufficient-license)
    - [Scenario: Exporting a mixture of prebuilt and custom rules via bulk action under insufficient license\*\*](#scenario-exporting-a-mixture-of-prebuilt-and-custom-rules-via-bulk-action-under-insufficient-license)

## Useful information

### Tickets

- [Users can Customize Prebuilt Detection Rules](https://github.com/elastic/security-team/issues/1974) (internal)
- [Users can Customize Prebuilt Detection Rules: Milestone 3](https://github.com/elastic/kibana/issues/174168)
- [Allow exporting prebuilt rules at the API level](https://github.com/elastic/kibana/issues/180167)
- [Support exporting prebuilt rules from the Rule Management page](https://github.com/elastic/kibana/issues/180173)
- [Support exporting prebuilt rules from the Rule Details page](https://github.com/elastic/kibana/issues/180176)
- [Tests for prebuilt rule import/export workflow](https://github.com/elastic/kibana/issues/202079)

### Terminology

- [Common terminology](./prebuilt_rules_common_info.md#common-terminology).

## Requirements

### Assumptions

Assumptions about test environments and scenarios outlined in this test plan.

- [Common assumptions](./prebuilt_rules_common_info.md#common-assumptions).

### Technical requirements

Non-functional requirements for the functionality outlined in this test plan.

- [Common technical requirements](./prebuilt_rules_common_info.md#common-technical-requirements).

### Product requirements

Functional requirements for the functionality outlined in this test plan.

- [Common product requirements](./prebuilt_rules_common_info.md#common-product-requirements).

User stories:

- User can export a single prebuilt rule from the Rule Details page.
- User can export multiple prebuilt rules one-by-one from the Rule Management page.
- User can export multiple prebuilt rules in bulk from the Rule Management page via bulk actions.
- User can export prebuilt non-customized rules.
- User can export prebuilt customized rules.
- User can export any combination of prebuilt non-customized, prebuilt customized, and custom rules.

## Scenarios

### Core Functionality

#### Scenario: Exporting prebuilt rule individually from rule details page

**Automation**: 2 cypress tests.

```Gherkin
Given a space with a <rule_type> rule installed
When the user selects "Export rule" from the "All actions" dropdown on the rule's detail page
Then the rule should be exported as an NDJSON file
And it should include an "immutable" field with a value of true
And its "ruleSource" "type" should be "external"
And its "ruleSource" "isCustomized" value should be <is_customized>

Examples:
| rule_type               | is_customized |
| prebuilt customized     | true          |
| prebuilt non-customized | false         |
```

#### Scenario: Exporting custom rule individually from rule details page

**Automation**: 1 cypress test.

```Gherkin
Given a space with a custom rule installed
When the user selects "Export rule" from the "All actions" dropdown on the rule's detail page
Then the rule should be exported as an NDJSON file
And it should include an "immutable" field with a value of false
And its "ruleSource" "type" should be "internal"
```

#### Scenario: Exporting prebuilt rule individually from rules management table

**Automation**: 2 cypress tests.

```Gherkin
Given a space with a <rule_type> rule installed
When the user selects "Export rule" from the rule's overflow dropdown on the rules management page
Then the rule should be exported as an NDJSON file
And it should include an "immutable" field with a value of true
And its "ruleSource" "type" should be "external"
And its "ruleSource" "isCustomized" value should be <is_customized>

Examples:
| rule_type               | is_customized |
| prebuilt customized     | true          |
| prebuilt non-customized | false         |
```

#### Scenario: Exporting custom rule individually from rules management table

**Automation**: 1 cypress test.

```Gherkin
Given a space with a custom rule installed
When the user selects "Export rule" from the rule's overflow dropdown on the rules management page
Then the rule should be exported as an NDJSON file
And it should include an "immutable" field with a value of false
And its "ruleSource" "type" should be "internal"
```

#### Scenario: Exporting prebuilt rules in bulk

**Automation**: 2 cypress tests.

```Gherkin
Given a space with multiple <rule_type> rules installed
When the user selects rules in the rules table
And chooses "Export" from bulk actions
Then the selected rules should be exported as an NDJSON file
And they should include an "immutable" field with a value of true
And their "ruleSource" "type" should be "external"
And their "ruleSource" "isCustomized" should depend be <is_customized>

Examples:
| rule_type               | is_customized |
| prebuilt customized     | true          |
| prebuilt non-customized | false         |
```

#### Scenario: Exporting custom rules in bulk

**Automation**: 1 cypress test.

```Gherkin
Given a space with multiple custom rules installed
When the user selects rules in the rules table
And chooses "Export" from bulk actions
Then the selected rules should be exported as an NDJSON file
And they should include an "immutable" field with a value of false
And their "ruleSource" "type" should be "internal"
```

#### Scenario: Exporting both prebuilt and custom rules in bulk

**Automation**: 1 cypress test.

```Gherkin
Given a space with customized prebuilt, non-customized prebuilt and custom rules installed
When the user selects rules from each type in the rules table
And chooses "Export" from bulk actions
Then the selected rules should be exported as an NDJSON file
And the prebuilt rules should include an "immutable" field with a value of true
And the custom rules should include an "immutable" field with a value of false
And the prebuilt rules' "ruleSource" "type" should be "external"
And the custom rules' "ruleSource" "type" should be "internal"
And the customized prebuilt rules' "isCustomized" value should be true
```

### Error Handling

#### Scenario: Exporting beyond the export limit

```Gherkin
Given a space with prebuilt and custom rules installed
And the number of rules is greater than the export limit (defaults to 10_000)
Then the request should be rejected as a bad request
```

### Licensing

#### Scenario: Exporting a mixture of prebuilt and custom rules via export API under insufficient license**

**Automation**: 1 API integration test.

```Gherkin
Given a Kibana instance running under an insufficient license
And a space with prebuilt customized, prebuilt non-customized and custom rules installed
When the user exports all rules via the export API
Then all rules should be successfully exported as an NDJSON file
```

#### Scenario: Exporting a mixture of prebuilt and custom rules via bulk action under insufficient license**

**Automation**: 1 API integration test, 1 e2e test.

```Gherkin
Given a Kibana instance running under an insufficient license
And a space with prebuilt customized, prebuilt non-customized and custom rules installed
When the user selects rules of each type in the rules table
And chooses "Export" from bulk actions
Then all selected rules should be successfully exported as an NDJSON file
```