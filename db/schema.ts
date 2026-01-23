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
  aiSummary: text('ai_summary'),
  highlights: jsonb('highlights').default([]),
  metrics: jsonb('metrics').default({}),
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

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'admin' or 'kudos'
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Research kanban board items - linked to Linear issues
export const researchItems = pgTable('research_items', {
  id: serial('id').primaryKey(),
  linearIssueId: text('linear_issue_id').notNull().unique(),
  linearIssueIdentifier: text('linear_issue_identifier').notNull(), // e.g., "ENG-123"
  linearIssueTitle: text('linear_issue_title').notNull(),
  linearIssueUrl: text('linear_issue_url').notNull(),
  column: text('column').notNull().default('backlog'), // backlog, exploring, deep_dive, synthesizing, parked
  displayOrder: integer('display_order').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
