import { User, ToolPermissions, PermissionLevel } from '../types';

/**
 * Checks if a user has a specific permission level for a tool.
 * 
 * @param user The user object
 * @param tool The tool key (e.g., 'submittals', 'milestones')
 * @param requiredLevel The required level ('VIEWER' or 'EDITOR')
 * @returns boolean
 */
export const hasPermission = (user: User, tool: keyof ToolPermissions, requiredLevel: PermissionLevel): boolean => {
  // Admins always have full access
  if (user.role === 'ADMIN') return true;
  
  if (!user.permissions) {
    // Default behavior if no permissions are set:
    // Subcontractors might have some default access? 
    // For now, let's assume no access if not explicitly granted via the new system,
    // or we can allow 'VIEWER' by default for some tools to avoid breaking things.
    return false;
  }
  
  const permissions = (typeof user.permissions === 'string' 
    ? JSON.parse(user.permissions) 
    : user.permissions) as ToolPermissions;
    
  const userLevel = permissions[tool] || 'NONE';
  
  if (requiredLevel === 'EDITOR') {
    return userLevel === 'EDITOR';
  }
  
  if (requiredLevel === 'VIEWER') {
    return userLevel === 'VIEWER' || userLevel === 'EDITOR';
  }
  
  return true;
};
