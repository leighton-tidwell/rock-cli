# Resource Reference

Complete list of Rock RMS v2 API resources organized by category. Use `rock resource list` to
see all resources, or `rock resource list --category "<name>"` to filter.

## People & Families

| Resource | Description |
|----------|-------------|
| People | Person records (FirstName, LastName, Email, BirthDate, etc.) |
| PersonAlias | Person alias records (a person can have multiple aliases from merges) |
| PhoneNumber | Phone numbers associated with people |
| PersonSearchKey | Alternate search keys for people (previous emails, alternate names) |
| PersonBadge | Badge definitions shown on person profiles |
| PersonDuplicate | Potential duplicate person records for merge review |
| PersonMergeRequest | Requests to merge duplicate person records |
| PersonScheduleExclusion | Date ranges when a person is unavailable for scheduling |
| PersonToken | API tokens associated with a person |
| PersonPreference | User preferences stored per person |

Key fields for People: Id, FirstName, NickName, LastName, Email, Gender (0=Unknown, 1=Male, 2=Female), BirthDate, PrimaryCampusId, ConnectionStatusValueId, RecordStatusValueId, PhotoUrl, IsDeceased.

Key fields for PersonAlias: Id, PersonId, AliasPersonId. Many entities reference PersonAliasId, not PersonId.

## Groups & Membership

| Resource | Description |
|----------|-------------|
| Group | Groups of all types (families, small groups, serving teams, security roles) |
| GroupMember | Membership records linking people to groups |
| GroupType | Definitions of group types (Family, Small Group, Serving Team, etc.) |
| GroupTypeRole | Roles within a group type (Leader, Member, Adult, Child) |
| GroupScheduleExclusion | Exclusion dates for group scheduling |
| GroupMemberAssignment | Assignments for group members to specific locations/schedules |
| GroupMemberScheduleTemplate | Schedule templates for group members |
| GroupSync | Sync configurations between groups and external data |
| GroupDemographicType | Demographic type definitions for groups |
| GroupDemographicValue | Demographic values for groups |
| GroupLocationHistoricalSchedule | Historical schedule data for group locations |

Key fields for Group: Id, Name, GroupTypeId, CampusId, ParentGroupId, IsActive, Description, GroupCapacity.

Key fields for GroupMember: Id, GroupId, PersonId, GroupRoleId, GroupMemberStatus (0=Inactive, 1=Active, 2=Pending).

Common GroupTypeId values (vary by instance): 10=Family, 25=Small Group, 23=Serving Team, 50=Security Role.

## Financial

| Resource | Description |
|----------|-------------|
| FinancialTransaction | Individual financial transactions |
| FinancialTransactionDetail | Line items within a transaction (amounts per account) |
| FinancialAccount | Fund/account definitions (General Fund, Building Fund, etc.) |
| FinancialBatch | Batches that group transactions together |
| FinancialGateway | Payment gateway configurations |
| FinancialPledge | Pledges made by individuals |
| FinancialScheduledTransaction | Recurring scheduled transactions |
| FinancialScheduledTransactionDetail | Line items for scheduled transactions |
| FinancialPaymentDetail | Payment method details for transactions |
| FinancialPersonBankAccount | Bank account records for ACH |
| FinancialPersonSavedAccount | Saved payment methods |
| FinancialStatementTemplate | Statement/receipt templates |
| FinancialTransactionAlert | Alerts for transaction anomalies |
| FinancialTransactionAlertType | Alert type definitions |
| FinancialTransactionImage | Images attached to transactions (check scans) |
| FinancialTransactionRefund | Refund records |

Key fields for FinancialTransaction: Id, TransactionDateTime, TotalAmount, AuthorizedPersonAliasId, TransactionTypeValueId, SourceTypeValueId, FinancialGatewayId, BatchId.

Key fields for FinancialTransactionDetail: Id, TransactionId, AccountId, Amount.

Key fields for FinancialAccount: Id, Name, ParentAccountId, IsActive, IsTaxDeductible, CampusId.

## Attendance & Check-in

| Resource | Description |
|----------|-------------|
| Attendance | Individual attendance records |
| AttendanceOccurrence | Occurrence records (group + schedule + date) |
| CheckInLabel | Check-in label definitions |
| Device | Kiosk/device records |
| Location | Physical locations (rooms, buildings, campuses) |
| LocationLayout | Layout configurations for locations |

Key fields for Attendance: Id, OccurrenceId, PersonAliasId, StartDateTime, DidAttend, CampusId.

Key fields for AttendanceOccurrence: Id, GroupId, LocationId, ScheduleId, OccurrenceDate.

## Communication

| Resource | Description |
|----------|-------------|
| Communication | Communication records (emails, SMS) |
| CommunicationRecipient | Recipients of a communication |
| CommunicationTemplate | Reusable communication templates |
| CommunicationTemplateAttachment | Attachments on templates |
| SystemCommunication | System-level communication definitions |
| SystemEmail | Legacy system email templates |
| CommunicationResponse | Responses/replies to communications |
| SmsAction | SMS keyword actions |
| SmsPipeline | SMS processing pipelines |

## Workflows

| Resource | Description |
|----------|-------------|
| Workflow | Workflow instances (running or completed) |
| WorkflowType | Workflow type definitions (templates) |
| WorkflowActivity | Activities within a workflow instance |
| WorkflowActivityType | Activity type definitions |
| WorkflowAction | Actions within workflow activities |
| WorkflowActionType | Action type definitions |
| WorkflowTrigger | Triggers that launch workflows |
| WorkflowActionForm | Form definitions for workflow actions |
| WorkflowActionFormAttribute | Attributes on workflow action forms |

Key fields for Workflow: Id, WorkflowTypeId, Name, Status, IsCompleted, CompletedDateTime, ActivatedDateTime.

Key fields for WorkflowType: Id, Name, Description, IsActive, CategoryId.

## CMS & Pages

| Resource | Description |
|----------|-------------|
| Page | Rock CMS pages |
| Block | Content blocks on pages |
| BlockType | Block type definitions |
| Layout | Page layout templates |
| Site | Website/application definitions |
| PageRoute | URL routes for pages |
| HtmlContent | HTML content blocks |
| PageContext | Context objects for pages |
| SiteDomain | Domain names for sites |
| Shortlink | Short URL definitions |
| PersonalLink | User-specific bookmarks |
| PersonalLinkSection | Sections for organizing personal links |
| AdaptiveMessage | Messages that adapt based on context |

## Content & Media

| Resource | Description |
|----------|-------------|
| ContentChannel | Content channel definitions (Blog, News, Sermons, etc.) |
| ContentChannelItem | Individual content items within channels |
| ContentChannelType | Content channel type definitions |
| ContentChannelItemSlug | URL slugs for content items |
| MediaFolder | Folders for organizing media |
| MediaElement | Individual media files/elements |
| MediaAccount | Media hosting account configurations |

Key fields for ContentChannelItem: Id, Title, Content, ContentChannelId, Status (1=Pending, 2=Approved, 3=Denied), StartDateTime, ExpireDateTime, Priority.

## Events & Registration

| Resource | Description |
|----------|-------------|
| EventItem | Event definitions |
| EventItemOccurrence | Specific occurrences of events |
| EventCalendar | Calendar definitions |
| EventItemOccurrenceChannelItem | Links between events and content channels |
| Registration | Individual registrations |
| RegistrationInstance | Registration period instances |
| RegistrationTemplate | Registration form templates |
| RegistrationRegistrant | Individual registrants |
| RegistrationTemplateFee | Fee definitions on templates |
| RegistrationTemplateDiscount | Discount codes for registration |
| RegistrationTemplatePlacement | Placement group configs |

## Connections

| Resource | Description |
|----------|-------------|
| ConnectionRequest | Connection/follow-up requests |
| ConnectionOpportunity | Opportunity definitions (Serving, Groups, etc.) |
| ConnectionType | Connection type definitions |
| ConnectionStatus | Status definitions for connections |
| ConnectionActivityType | Activity type definitions |
| ConnectionRequestActivity | Activities on connection requests |
| ConnectionWorkflow | Workflows triggered by connections |
| ConnectionOpportunityCampus | Campus-specific opportunity configs |
| ConnectionOpportunityGroup | Groups associated with opportunities |

## Steps & Streaks

| Resource | Description |
|----------|-------------|
| Step | Individual step completions |
| StepProgram | Step program definitions (Growth Track, Membership, etc.) |
| StepType | Step type definitions within programs |
| StepStatus | Status definitions for steps |
| StepWorkflowTrigger | Workflows triggered by step completions |
| Streak | Individual streak records |
| StreakType | Streak type definitions |
| StreakTypeExclusion | Exclusion dates for streaks |

## Data & Reporting

| Resource | Description |
|----------|-------------|
| DataView | Saved data view definitions |
| DataViewFilter | Filters within data views |
| Report | Report definitions |
| ReportField | Fields within reports |
| PersistedDataset | Cached/persisted datasets |
| Metric | Metric definitions |
| MetricValue | Individual metric values/measurements |
| MetricCategory | Categories for metrics |
| MetricPartition | Partition definitions for metrics |
| MetricValuePartition | Partition values for metric values |

## Security & Auth

| Resource | Description |
|----------|-------------|
| Auth | Authorization rules |
| UserLogin | User login/authentication records |
| RestAction | REST API action definitions |
| RestController | REST API controller definitions |
| PersonToken | Person-specific API tokens |
| AuthClaim | Authentication claims |
| AuthClient | OAuth client definitions |
| AuthScope | OAuth scope definitions |

## Interactions & Engagement

| Resource | Description |
|----------|-------------|
| Interaction | Individual interaction records |
| InteractionChannel | Interaction channel definitions |
| InteractionComponent | Component definitions within channels |
| InteractionSession | Session records |
| InteractionDeviceType | Device type definitions for interactions |
| AchievementAttempt | Achievement attempt records |
| AchievementType | Achievement type definitions |

## Notes & Documents

| Resource | Description |
|----------|-------------|
| Note | Notes attached to entities |
| NoteType | Note type definitions |
| NoteWatch | Note watch/subscription records |
| Document | Documents attached to entities |
| DocumentType | Document type definitions |
| BinaryFile | Uploaded files |
| BinaryFileType | File type definitions |
| SignatureDocument | Electronic signature documents |
| SignatureDocumentTemplate | Signature document templates |

## Prayer

| Resource | Description |
|----------|-------------|
| PrayerRequest | Prayer request records |
| PrayerRequestComment | Comments on prayer requests |

Key fields for PrayerRequest: Id, FirstName, LastName, Email, Text, Answer, IsActive, IsApproved, CategoryId, CreatedDateTime.

## Benevolence

| Resource | Description |
|----------|-------------|
| BenevolenceRequest | Benevolence/assistance requests |
| BenevolenceType | Benevolence type definitions |
| BenevolenceResult | Results/outcomes of benevolence requests |
| BenevolenceWorkflow | Workflows for benevolence processing |

## Scheduling

| Resource | Description |
|----------|-------------|
| Schedule | Schedule definitions |
| ScheduleCategoryExclusion | Exclusion dates for schedule categories |

## Learning

| Resource | Description |
|----------|-------------|
| LearningCourse | Course definitions |
| LearningClass | Class instances of courses |
| LearningActivity | Activities within classes |
| LearningParticipant | Participant enrollment records |
| LearningProgram | Program definitions containing courses |
| LearningGradingSystem | Grading system definitions |
| LearningGradingSystemScale | Scale definitions within grading systems |
| LearningSemester | Semester/term definitions |

## Notifications & Reminders

| Resource | Description |
|----------|-------------|
| Reminder | Reminder records |
| ReminderType | Reminder type definitions |
| NotificationMessage | Push notification messages |
| NotificationRecipient | Recipients of notifications |

## Tags

| Resource | Description |
|----------|-------------|
| Tag | Tag definitions |
| TaggedItem | Items tagged with a specific tag |

## AI

| Resource | Description |
|----------|-------------|
| AiProvider | AI provider configurations |
| AiAutomation | AI automation definitions |

## Analytics

| Resource | Description |
|----------|-------------|
| AnalyticsDimFamilyCurrent | Current family dimension data |
| AnalyticsDimFamilyHeadOfHousehold | Head of household dimension data |
| AnalyticsDimFamilyHistorical | Historical family dimension data |
| AnalyticsDimFinancialAccount | Financial account dimension data |
| AnalyticsDimFinancialBatch | Financial batch dimension data |
| AnalyticsDimPersonCurrent | Current person dimension data |
| AnalyticsDimPersonHistorical | Historical person dimension data |
| AnalyticsFactAttendance | Attendance fact data |
| AnalyticsFactFinancialTransaction | Financial transaction fact data |
| AnalyticsSourceDate | Date dimension data |
| AnalyticsSourceFamilyHistorical | Source family history data |
| AnalyticsSourcePersonHistorical | Source person history data |

## System & Admin

| Resource | Description |
|----------|-------------|
| Campus | Campus/location definitions |
| DefinedType | Lookup list/defined type definitions |
| DefinedValue | Values within defined types |
| EntityType | Entity type registry |
| Attribute | Attribute definitions |
| AttributeValue | Attribute values on entities |
| Category | Category definitions (used across many entities) |
| SystemConfiguration | System-level configuration settings |
| ServiceJob | Background job definitions |
| ServiceLog | Service/job log entries |
| ExceptionLog | Exception/error log entries |
| Audit | Audit trail records |
| AuditDetail | Audit detail records |
| FollowingEventType | Following event type definitions |
| Following | Following records (who follows what) |
| EntitySet | Entity set definitions |
| EntitySetItem | Items within entity sets |
| BackgroundCheck | Background check records |
| MergeTemplate | Mail merge template definitions |
| SystemGuid | System GUID registry |
| PluginMigration | Plugin migration tracking |
| FieldType | Field type definitions |
