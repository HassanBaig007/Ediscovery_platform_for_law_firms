// Transaction Manager
// Manages database transactions for critical operations

export interface Transaction {
    id: string;
    operations: Array<{
        type: string;
        data: any;
        timestamp: Date;
    }>;
    status: 'pending' | 'committed' | 'rolled_back';
    startedAt: Date;
    completedAt?: Date;
}

export class TransactionManager {
    private activeTransactions: Map<string, Transaction> = new Map();
    private transactionHistory: Transaction[] = [];

    /**
     * Begin a new transaction
     */
    async beginTransaction(): Promise<string> {
        const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const transaction: Transaction = {
            id: transactionId,
            operations: [],
            status: 'pending',
            startedAt: new Date()
        };

        this.activeTransactions.set(transactionId, transaction);
        return transactionId;
    }

    /**
     * Add operation to transaction
     */
    async addOperation(
        transactionId: string,
        operationType: string,
        data: any
    ): Promise<void> {
        const transaction = this.activeTransactions.get(transactionId);

        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }

        if (transaction.status !== 'pending') {
            throw new Error(`Transaction ${transactionId} is not in pending state`);
        }

        transaction.operations.push({
            type: operationType,
            data,
            timestamp: new Date()
        });
    }

    /**
     * Commit transaction
     */
    async commit(transactionId: string): Promise<void> {
        const transaction = this.activeTransactions.get(transactionId);

        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }

        if (transaction.status !== 'pending') {
            throw new Error(`Transaction ${transactionId} is not in pending state`);
        }

        try {
            // In real implementation, would commit to database
            transaction.status = 'committed';
            transaction.completedAt = new Date();

            // Move to history
            this.transactionHistory.push(transaction);
            this.activeTransactions.delete(transactionId);
        } catch (error) {
            // Rollback on error
            await this.rollback(transactionId);
            throw error;
        }
    }

    /**
     * Rollback transaction
     */
    async rollback(transactionId: string): Promise<void> {
        const transaction = this.activeTransactions.get(transactionId);

        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }

        // Reverse operations in reverse order
        for (let i = transaction.operations.length - 1; i >= 0; i--) {
            const operation = transaction.operations[i];
            // In real implementation, would reverse the operation
            console.log(`Rolling back operation: ${operation.type}`);
        }

        transaction.status = 'rolled_back';
        transaction.completedAt = new Date();

        // Move to history
        this.transactionHistory.push(transaction);
        this.activeTransactions.delete(transactionId);
    }

    /**
     * Execute operation within transaction
     */
    async executeInTransaction<T>(
        operation: (transactionId: string) => Promise<T>
    ): Promise<T> {
        const transactionId = await this.beginTransaction();

        try {
            const result = await operation(transactionId);
            await this.commit(transactionId);
            return result;
        } catch (error) {
            await this.rollback(transactionId);
            throw error;
        }
    }

    /**
     * Verify data consistency
     */
    async verifyConsistency(transactionId: string): Promise<{ consistent: boolean; issues: string[] }> {
        const transaction = this.activeTransactions.get(transactionId) || 
                           this.transactionHistory.find(t => t.id === transactionId);

        if (!transaction) {
            return {
                consistent: false,
                issues: [`Transaction ${transactionId} not found`]
            };
        }

        const issues: string[] = [];

        // Check if all operations have timestamps
        for (const operation of transaction.operations) {
            if (!operation.timestamp) {
                issues.push(`Operation ${operation.type} missing timestamp`);
            }
        }

        // Check transaction status
        if (transaction.status === 'pending') {
            issues.push('Transaction is still pending');
        }

        return {
            consistent: issues.length === 0,
            issues
        };
    }

    /**
     * Get transaction status
     */
    getTransactionStatus(transactionId: string): Transaction['status'] | null {
        const transaction = this.activeTransactions.get(transactionId) ||
                           this.transactionHistory.find(t => t.id === transactionId);

        return transaction?.status || null;
    }

    /**
     * Get active transactions
     */
    getActiveTransactions(): Transaction[] {
        return Array.from(this.activeTransactions.values());
    }

    /**
     * Get transaction history
     */
    getTransactionHistory(limit: number = 100): Transaction[] {
        return this.transactionHistory
            .slice(-limit)
            .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    }

    /**
     * Clean up stale transactions
     */
    async cleanupStaleTransactions(maxAgeMs: number = 3600000): Promise<number> {
        const cutoffTime = Date.now() - maxAgeMs;
        let count = 0;

        for (const [id, transaction] of this.activeTransactions.entries()) {
            if (transaction.startedAt.getTime() < cutoffTime) {
                await this.rollback(id);
                count++;
            }
        }

        return count;
    }
}
