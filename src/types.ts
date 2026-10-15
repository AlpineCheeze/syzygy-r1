/**
 * Global Type Definitions
 * 
 * This file contains all the TypeScript interfaces and types used across the application.
 * These types mirror the database schema and ensure type safety between the frontend and backend.
 */

// ==========================================
// Enums & Literal Types
// ==========================================

export type Role = 'ADMIN' | 'SUBCONTRACTOR';
export type Status = 'PENDING' | 'SUBMITTED' | 'REVISE_AND_RESUBMIT' | 'APPROVED';
export type BallInCourt = 'SUBCONTRACTOR' | 'GC';
export type InspectionType = 'OBSERVATION' | 'PUNCH_LIST';
export type InspectionStatus = 'OPEN' | 'REVIEW' | 'RESOLVED';
export type MilestoneReqStatus = 'PENDING' | 'COMPLETED';
export type PermissionLevel = 'NONE' | 'VIEWER' | 'EDITOR';

export interface ToolPermissions {
  submittals: PermissionLevel;
  inspections: PermissionLevel;
  milestones: PermissionLevel;
  photos: PermissionLevel;
  drawings: PermissionLevel;
  meetings: PermissionLevel;
  warranty: PermissionLevel;
  schedule: PermissionLevel;
  procurement: PermissionLevel;
  incidents: PermissionLevel;
  directory: PermissionLevel;
  forum: PermissionLevel;
}

// ==========================================
// Core Entities
// ==========================================

/**
 * Represents a user in the system.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  company_name: string;
  role: Role;
  permissions?: ToolPermissions | string;
}

/**
 * Represents a construction project.
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  start_date: string;
  end_date: string;
  next_milestone_date?: string;
}

export interface Inspection {
  id: string;
  project_id: string;
  name: string;
  type: InspectionType;
  description: string;
  assigned_company: string;
  status: InspectionStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface InspectionItemPhoto {
  id: string;
  inspection_item_id: string;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
  tag?: 'issue' | 'solution';
  location?: string;
}

export interface InspectionItem {
  id: string;
  inspection_id: string;
  description: string;
  assigned_company: string;
  status: InspectionStatus;
  ball_in_court: BallInCourt;
  created_at: string;
  resolved_at: string | null;
  photos?: InspectionItemPhoto[];
}

export interface InspectionTemplate {
  id: string;
  project_id: string;
  name: string;
  type: InspectionType;
  description: string;
  created_at: string;
}

export interface InspectionTemplateItem {
  id: string;
  template_id: string;
  description: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  certificate_url?: string | null;
  created_at: string;
}

export interface MilestoneActivity {
  id: string;
  milestone_id: string;
  user_id: string;
  user_name: string;
  activity_type: string;
  details: string;
  created_at: string;
}

export interface MilestoneRequirement {
  id: string;
  milestone_id: string;
  description: string;
  assigned_company: string;
  status: MilestoneReqStatus;
  completed_at: string | null;
}

export type MilestoneDeliverableStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export interface MilestoneDeliverable {
  id: string;
  milestone_id: string;
  description: string;
  ball_in_court: string;
  file_url: string | null;
  status: MilestoneDeliverableStatus;
  created_at: string;
}

export interface MilestoneTemplate {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface MilestoneTemplateDeliverable {
  id: string;
  template_id: string;
  description: string;
  ball_in_court: string;
}

export interface PhotoFolder {
  id: string;
  project_id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface Photo {
  id: string;
  folder_id: string;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface DrawingSet {
  id: string;
  project_id: string;
  name: string;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
  is_current: number;
  is_archived: number;
}

export interface ProcurementItem {
  id: string;
  project_id: string;
  item_name: string;
  status: 'PENDING' | 'ORDERED' | 'IN_TRANSIT' | 'DELIVERED' | 'INSTALLED';
  expected_delivery_date: string;
  required_on_site_date: string;
  assigned_company: string;
  created_at: string;
}

export interface WarrantyItem {
  id: string;
  project_id: string;
  title: string;
  description: string;
  issue_photo_url: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assigned_company: string;
  solution_photo_url: string | null;
  solution_comment: string | null;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface Meeting {
  id: string;
  project_id: string;
  title: string;
  date: string;
  location: string;
  agenda: string;
  minutes: string;
  created_by: string;
  created_at: string;
}

export interface Contact {
  id: string;
  project_id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  project_role: 'ADMIN' | 'SUBCONTRACTOR';
  is_invited: number;
  permissions?: ToolPermissions | string;
}

export interface Requirement {
  id: string;
  project_id: string;
  category: string;
  description: string;
  assigned_company: string;
  target_due_date: string;
  created_at: string;
}

export interface Submittal {
  id: string;
  requirement_id: string;
  revision_no: number;
  file_url: string;
  status: Status;
  ball_in_court: BallInCourt;
  reviewer_notes: string;
  submission_date: string;
  review_date: string;
  
  // Joined fields
  project_id: string;
  category: string;
  description: string;
  assigned_company: string;
  target_due_date: string;
}

export interface DistributionGroup {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count?: number;
}

export interface DistributionGroupMember {
  group_id: string;
  user_id: string;
}

export interface ForumPost {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  title: string;
  content: string;
  file_url?: string;
  type: 'DISCUSSION' | 'RFI' | 'CHANGE_ORDER';
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  reply_count?: number;
}

export interface ForumReply {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  content: string;
  file_url?: string;
  created_at: string;
}

export interface ForumMention {
  id: string;
  post_id?: string;
  reply_id?: string;
  mention_type: 'USER' | 'GROUP';
  target_id: string;
  created_at: string;
}
