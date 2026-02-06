import { integer, pgTable, varchar, text, date, timestamp, jsonb, serial } from 'drizzle-orm/pg-core';

export const dailyStandups = pgTable('daily_standups', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(),
  yesterdaySummary: text('yesterday_summary'),
  yesterdaySummaryHtml: text('yesterday_summary_html'),
  todayPlan: text('today_plan'),
  todayPlanHtml: text('today_plan_html'),
  blockers: text('blockers'),
  blockersHtml: text('blockers_html'),
  linkedIssues: jsonb('linked_issues').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const weeklyStandups = pgTable('weekly_standups', {
  id: serial('id').primaryKey(),
  weekStart: date('week_start').notNull().unique(),
  plannedAccomplishments: text('planned_accomplishments'),
  plannedAccomplishmentsHtml: text('planned_accomplishments_html'),
  linkedIssues: jsonb('linked_issues').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const weeklyReports = pgTable('weekly_reports', {
  id: serial('id').primaryKey(),
  weekStart: date('week_start').notNull().unique(),
  summary: text('summary'),
  summaryHtml: text('summary_html'),
  linkedIssues: jsonb('linked_issues').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const kudos = pgTable('kudos', {
  id: serial('id').primaryKey(),
  receivedDate: date('received_date').notNull(),
  senderName: text('sender_name').notNull(),
  message: text('message').notNull(),
  context: text('context'),
  screenshotBlobKey: text('screenshot_blob_key'),
  tags: jsonb('tags').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Research kanban board items - linked to Linear issues
export const researchItems = pgTable('research_items', {
  id: serial('id').primaryKey(),
  linearIssueId: text('linear_issue_id').notNull().unique(),
  linearIssueIdentifier: text('linear_issue_identifier').notNull(), // e.g., "ENG-123"
  linearIssueTitle: text('linear_issue_title').notNull(),
  linearIssueUrl: text('linear_issue_url').notNull(),
  title: text('title').notNull(), // Editable title (initially from Linear)
  description: text('description'), // Editable markdown description
  descriptionHtml: text('description_html'), // Pre-rendered HTML
  column: text('column').notNull().default('ideas'), // ideas, exploring, discussing, closed
  linearIssuePriority: integer('linear_issue_priority'),
  linearIssuePriorityLabel: text('linear_issue_priority_label'),
  displayOrder: integer('display_order').notNull().default(0),
  plannedIssueId: text('planned_issue_id'), // Linear issue for implementation work
  plannedIssueIdentifier: text('planned_issue_identifier'),
  plannedIssueTitle: text('planned_issue_title'),
  plannedIssueUrl: text('planned_issue_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Research item notes - timestamped notes for each research item
export const researchNotes = pgTable('research_notes', {
  id: serial('id').primaryKey(),
  researchItemId: integer('research_item_id').notNull().references(() => researchItems.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  contentHtml: text('content_html'),
  linearCommentId: text('linear_comment_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// Research item documents - linked URLs for each research item
export const researchDocuments = pgTable('research_documents', {
  id: serial('id').primaryKey(),
  researchItemId: integer('research_item_id').notNull().references(() => researchItems.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Impact/Work Shipped items - track shipped work for promotion evidence
export const impactItems = pgTable('impact_items', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  descriptionHtml: text('description_html'),
  shippedDate: date('shipped_date').notNull(),
  linearIssueId: text('linear_issue_id'),
  linearIssueIdentifier: text('linear_issue_identifier'),
  linearIssueTitle: text('linear_issue_title'),
  linearIssueUrl: text('linear_issue_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Impact item notes - timestamped notes for each impact item
export const impactNotes = pgTable('impact_notes', {
  id: serial('id').primaryKey(),
  impactItemId: integer('impact_item_id').notNull().references(() => impactItems.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  contentHtml: text('content_html'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// Impact item links - URL + label pairs for each impact item
export const impactLinks = pgTable('impact_links', {
  id: serial('id').primaryKey(),
  impactItemId: integer('impact_item_id').notNull().references(() => impactItems.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  label: text('label').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
