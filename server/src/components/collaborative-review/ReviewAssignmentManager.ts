// Review Assignment Manager
// Manages document review assignments and workload balancing

import { ReviewAssignment, ReviewProgress } from '../../../../shared/enhanced-types';

export interface AssignmentConfig {
    maxDocumentsPerReviewer?: number;
    priorityWeights?: {
        low: number;
        medium: number;
        high: number;
        critical: number;
    };
}

export class ReviewAssignmentManager {
    private assignments: Map<string, ReviewAssignment> = new Map();
    private config: Required<AssignmentConfig>;

    constructor(config: AssignmentConfig = {}) {
        this.config = {
            maxDocumentsPerReviewer: config.maxDocumentsPerReviewer || 100,
            priorityWeights: config.priorityWeights || {
                low: 1,
                medium: 2,
                high: 3,
                critical: 5
            }
        };
    }

    /**
     * Assign documents to a reviewer
     */
    async assignDocuments(
        reviewerId: string,
        documentIds: string[],
        priority: ReviewAssignment['priority'] = 'medium',
        deadline?: Date
    ): Promise<ReviewAssignment[]> {
        // Check workload
        const currentWorkload = this.getReviewerWorkload(reviewerId);
        
        if (currentWorkload + documentIds.length > this.config.maxDocumentsPerReviewer) {
            throw new Error(
                `Reviewer ${reviewerId} workload would exceed maximum of ${this.config.maxDocumentsPerReviewer} documents`
            );
        }

        const assignments: ReviewAssignment[] = [];
        const now = new Date();

        for (const documentId of documentIds) {
            const assignment: ReviewAssignment = {
                id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                reviewerId,
                documentId,
                assignedAt: now,
                status: 'assigned',
                priority,
                deadline
            };

            this.assignments.set(assignment.id, assignment);
            assignments.push(assignment);
        }

        return assignments;
    }

    /**
     * Get reviewer workload (number of pending assignments)
     */
    getReviewerWorkload(reviewerId: string): number {
        return Array.from(this.assignments.values())
            .filter(a => a.reviewerId === reviewerId && a.status !== 'completed')
            .length;
    }

    /**
     * Get all assignments for a reviewer
     */
    getReviewerAssignments(reviewerId: string): ReviewAssignment[] {
        return Array.from(this.assignments.values())
            .filter(a => a.reviewerId === reviewerId);
    }

    /**
     * Update assignment status
     */
    async updateAssignmentStatus(
        assignmentId: string,
        status: ReviewAssignment['status']
    ): Promise<ReviewAssignment> {
        const assignment = this.assignments.get(assignmentId);
        
        if (!assignment) {
            throw new Error(`Assignment ${assignmentId} not found`);
        }

        assignment.status = status;
        
        if (status === 'completed') {
            assignment.completedAt = new Date();
        }

        this.assignments.set(assignmentId, assignment);
        return assignment;
    }

    /**
     * Get assignment by document ID
     */
    getAssignmentByDocument(documentId: string): ReviewAssignment | undefined {
        return Array.from(this.assignments.values())
            .find(a => a.documentId === documentId && a.status !== 'completed');
    }

    /**
     * Balance workload across reviewers
     */
    async balanceWorkload(
        reviewerIds: string[],
        documentIds: string[]
    ): Promise<Map<string, string[]>> {
        if (reviewerIds.length === 0) {
            throw new Error('At least one reviewer is required');
        }

        // Get current workload for each reviewer
        const workloads = new Map<string, number>();
        reviewerIds.forEach(id => {
            workloads.set(id, this.getReviewerWorkload(id));
        });

        // Distribute documents to balance workload
        const distribution = new Map<string, string[]>();
        reviewerIds.forEach(id => distribution.set(id, []));

        for (const documentId of documentIds) {
            // Find reviewer with lowest workload
            let minWorkload = Infinity;
            let selectedReviewer = reviewerIds[0];

            for (const reviewerId of reviewerIds) {
                const workload = workloads.get(reviewerId) || 0;
                if (workload < minWorkload) {
                    minWorkload = workload;
                    selectedReviewer = reviewerId;
                }
            }

            // Assign to selected reviewer
            distribution.get(selectedReviewer)?.push(documentId);
            workloads.set(selectedReviewer, (workloads.get(selectedReviewer) || 0) + 1);
        }

        return distribution;
    }

    /**
     * Get review progress for a set of assignments
     */
    async getReviewProgress(assignmentIds: string[]): Promise<ReviewProgress> {
        const relevantAssignments = assignmentIds
            .map(id => this.assignments.get(id))
            .filter((a): a is ReviewAssignment => a !== undefined);

        const totalDocuments = relevantAssignments.length;
        const reviewedDocuments = relevantAssignments.filter(a => a.status === 'completed').length;
        const pendingDocuments = totalDocuments - reviewedDocuments;

        // Calculate average time per document
        const completedAssignments = relevantAssignments.filter(a => a.completedAt);
        let averageTimePerDocument = 0;

        if (completedAssignments.length > 0) {
            const totalTime = completedAssignments.reduce((sum, a) => {
                const time = a.completedAt!.getTime() - a.assignedAt.getTime();
                return sum + time;
            }, 0);
            averageTimePerDocument = totalTime / completedAssignments.length / 1000; // Convert to seconds
        }

        // Calculate reviewer stats
        const reviewerStatsMap = new Map<string, {
            reviewerId: string;
            reviewerName: string;
            documentsReviewed: number;
            totalTime: number;
        }>();

        relevantAssignments.forEach(a => {
            if (!reviewerStatsMap.has(a.reviewerId)) {
                reviewerStatsMap.set(a.reviewerId, {
                    reviewerId: a.reviewerId,
                    reviewerName: `Reviewer ${a.reviewerId}`, // Would lookup actual name
                    documentsReviewed: 0,
                    totalTime: 0
                });
            }

            const stats = reviewerStatsMap.get(a.reviewerId)!;
            
            if (a.status === 'completed' && a.completedAt) {
                stats.documentsReviewed++;
                stats.totalTime += a.completedAt.getTime() - a.assignedAt.getTime();
            }
        });

        const reviewerStats = Array.from(reviewerStatsMap.values()).map(stats => ({
            reviewerId: stats.reviewerId,
            reviewerName: stats.reviewerName,
            documentsReviewed: stats.documentsReviewed,
            averageTime: stats.documentsReviewed > 0 
                ? stats.totalTime / stats.documentsReviewed / 1000 
                : 0
        }));

        return {
            totalDocuments,
            reviewedDocuments,
            pendingDocuments,
            progressPercentage: totalDocuments > 0 ? (reviewedDocuments / totalDocuments) * 100 : 0,
            averageTimePerDocument,
            reviewerStats
        };
    }

    /**
     * Get overdue assignments
     */
    getOverdueAssignments(): ReviewAssignment[] {
        const now = new Date();
        return Array.from(this.assignments.values())
            .filter(a => 
                a.deadline && 
                a.deadline < now && 
                a.status !== 'completed'
            );
    }

    /**
     * Reassign document to different reviewer
     */
    async reassignDocument(
        documentId: string,
        newReviewerId: string
    ): Promise<ReviewAssignment> {
        const existingAssignment = this.getAssignmentByDocument(documentId);
        
        if (existingAssignment) {
            // Mark old assignment as completed
            await this.updateAssignmentStatus(existingAssignment.id, 'completed');
        }

        // Create new assignment
        const assignments = await this.assignDocuments(newReviewerId, [documentId]);
        return assignments[0];
    }
}
