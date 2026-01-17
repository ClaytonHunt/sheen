/**
 * Permission Manager
 * 
 * Manages permissions for tool execution with safety features.
 * Supports allow/deny/ask patterns and destructive action detection.
 */

import inquirer from 'inquirer';

export type PermissionRule = 'allow' | 'deny' | 'ask';

export interface PermissionConfig {
  autoApprove: boolean;
  toolPermissions: Record<string, PermissionRule>;
}

export class PermissionManager {
  private permissions: Map<string, PermissionRule>;
  private autoApprove: boolean;
  private approvalHistory: Map<string, boolean> = new Map();

  constructor(config: PermissionConfig) {
    this.autoApprove = config.autoApprove;
    this.permissions = new Map(Object.entries(config.toolPermissions || {}));
    
    // Set default permissions for common tools
    if (!this.permissions.has('read')) this.permissions.set('read', 'allow');
    if (!this.permissions.has('bash')) this.permissions.set('bash', 'ask');
    if (!this.permissions.has('write')) this.permissions.set('write', 'ask');
    if (!this.permissions.has('edit')) this.permissions.set('edit', 'ask');
    if (!this.permissions.has('git_commit')) this.permissions.set('git_commit', 'ask');
  }

  /**
   * Check if a tool operation is permitted
   */
  async checkPermission(tool: string, params: any): Promise<boolean> {
    const rule = this.permissions.get(tool) || 'ask';
    
    // Allow rule - always permit
    if (rule === 'allow') {
      return true;
    }
    
    // Deny rule - always reject
    if (rule === 'deny') {
      console.warn(`[PERMISSION DENIED] Tool '${tool}' is not permitted`);
      return false;
    }
    
    // Check for destructive actions
    if (this.isDestructive(tool, params)) {
      console.warn(`[DESTRUCTIVE ACTION DETECTED] ${tool} with params:`, params);
      
      // Always ask for destructive actions, even in auto-approve mode
      return await this.requestApproval(tool, params, 'destructive');
    }
    
    // Check for high-risk actions
    if (this.isHighRisk(tool, params)) {
      console.warn(`[HIGH RISK ACTION] ${tool} with params:`, params);
      
      // Always ask for high-risk actions
      return await this.requestApproval(tool, params, 'high-risk');
    }
    
    // Auto-approve mode: allow non-destructive, non-high-risk actions
    if (this.autoApprove) {
      console.log(`[AUTO-APPROVED] ${tool}`);
      return true;
    }
    
    // Ask rule - request approval
    return await this.requestApproval(tool, params, 'normal');
  }

  /**
   * Detect destructive actions
   */
  private isDestructive(tool: string, params: any): boolean {
    if (tool === 'bash' && params.command) {
      const cmd = params.command.toLowerCase();
      
      // Destructive patterns
      const destructivePatterns = [
        /rm\s+-rf/,          // rm -rf
        /rm\s+--recursive/,  // rm --recursive --force
        /git\s+reset\s+--hard/, // git reset --hard
        /git\s+clean\s+-fd/, // git clean -fd
        /git\s+push\s+--force/, // git push --force
        /git\s+push\s+-f/,   // git push -f
        /sudo\s+rm/,         // sudo rm
        /del\s+\/s\s+\/q/,   // Windows: del /s /q
        /format\s+/,         // format command
        /mkfs\./,            // filesystem formatting
        /dd\s+if=/           // dd command
      ];
      
      return destructivePatterns.some(pattern => pattern.test(cmd));
    }
    
    // File deletion
    if (tool === 'bash' && params.command) {
      const cmd = params.command.toLowerCase();
      if (cmd.includes('rm ') || cmd.includes('del ')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Detect high-risk actions
   */
  private isHighRisk(tool: string, params: any): boolean {
    if (tool === 'bash' && params.command) {
      const cmd = params.command.toLowerCase();
      
      // High-risk patterns
      const highRiskPatterns = [
        /sudo\s+/,           // sudo commands
        /npm\s+publish/,     // package publishing
        /git\s+push/,        // pushing to remote
        /docker\s+run/,      // docker operations
        /chmod\s+\d{3}/,     // changing permissions
        /chown\s+/,          // changing ownership
        /curl.*\|\s*bash/,   // piping to bash
        /wget.*\|\s*sh/,     // piping to shell
        /eval\s+/,           // eval command
        /exec\s+/            // exec command
      ];
      
      return highRiskPatterns.some(pattern => pattern.test(cmd));
    }
    
    // Writing to sensitive paths
    if ((tool === 'write' || tool === 'edit') && params.path) {
      const path = params.path.toLowerCase();
      const sensitivePaths = [
        '.env',
        'credentials',
        'secrets',
        '.ssh/',
        'private_key',
        'id_rsa',
        'password'
      ];
      
      return sensitivePaths.some(sensitive => path.includes(sensitive));
    }
    
    return false;
  }

  /**
   * Request approval from user
   */
  private async requestApproval(
    tool: string, 
    params: any, 
    riskLevel: 'normal' | 'high-risk' | 'destructive'
  ): Promise<boolean> {
    // Generate a unique key for this approval
    const approvalKey = `${tool}:${JSON.stringify(params)}`;
    
    // Check if already approved in this session
    if (this.approvalHistory.has(approvalKey)) {
      return this.approvalHistory.get(approvalKey)!;
    }
    
    // In non-interactive environments (CI/CD), deny by default
    if (!process.stdin.isTTY) {
      console.error(`[PERMISSION] Cannot request approval in non-interactive mode`);
      return false;
    }
    
    // Format the prompt based on risk level
    let message = `[PERMISSION REQUIRED] Allow ${tool}?`;
    if (riskLevel === 'destructive') {
      message = `⚠️  [DESTRUCTIVE ACTION] Allow ${tool}?`;
    } else if (riskLevel === 'high-risk') {
      message = `⚠️  [HIGH RISK] Allow ${tool}?`;
    }
    
    console.log(`\nTool: ${tool}`);
    console.log(`Params:`, JSON.stringify(params, null, 2));
    
    try {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'approved',
          message,
          default: riskLevel === 'normal'
        }
      ]);
      
      const approved = answer.approved;
      
      // Cache the decision
      this.approvalHistory.set(approvalKey, approved);
      
      if (approved) {
        console.log(`✓ Approved ${tool}`);
      } else {
        console.log(`✗ Denied ${tool}`);
      }
      
      return approved;
    } catch (error) {
      // If inquirer fails, deny by default
      console.error(`[PERMISSION] Failed to request approval:`, error);
      return false;
    }
  }

  /**
   * Set permission for a tool
   */
  setPermission(tool: string, rule: PermissionRule): void {
    this.permissions.set(tool, rule);
  }

  /**
   * Get permission for a tool
   */
  getPermission(tool: string): PermissionRule {
    return this.permissions.get(tool) || 'ask';
  }

  /**
   * Clear approval history
   */
  clearHistory(): void {
    this.approvalHistory.clear();
  }

  /**
   * Set auto-approve mode
   */
  setAutoApprove(value: boolean): void {
    this.autoApprove = value;
  }

  /**
   * Get auto-approve mode
   */
  getAutoApprove(): boolean {
    return this.autoApprove;
  }
}
