import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { dashboardService, DashboardStats, ActivityItem } from '../services/dashboard.service';
import { ErrorState } from '../components/ui/ErrorState';

const ReviewStatisticsPage = () => {
  const { isAssociate } = useRole();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!isAssociate) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [statsData, activityData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getRecentActivity(20)
        ]);
        setStats(statsData);
        setActivity(activityData);
      } catch {
        setError('Unable to load your review statistics.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAssociate]);

  const reviewEvents = useMemo(() => {
    return activity.filter((item) => item.type?.toLowerCase().includes('review'));
  }, [activity]);

  if (!isAssociate) {
    return <PermissionDenied requiredRole="ASSOCIATE" />;
  }

  if (error && !isLoading) {
    return <ErrorState title="Statistics unavailable" message={error} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Review Statistics</h1>
        <p className="text-muted-foreground mt-1">Track your document review throughput and recent review activity.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-primary/10"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-primary">Pending Review</p><p className="text-2xl font-bold text-foreground">{stats?.pendingReview ?? 0}</p></CardContent></Card>
            <Card className="bg-success/10"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-success">Total Documents</p><p className="text-2xl font-bold text-foreground">{stats?.totalDocuments ?? 0}</p></CardContent></Card>
            <Card className="bg-warning/10"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-warning">Recent Review Events</p><p className="text-2xl font-bold text-foreground">{reviewEvents.length}</p></CardContent></Card>
            <Card className="bg-purple/10"><CardContent className="p-4"><p className="text-xs uppercase font-bold text-purple">Active Cases</p><p className="text-2xl font-bold text-foreground">{stats?.activeCases ?? 0}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Recent Review Activity</CardTitle>
              <CardDescription>Latest timeline entries related to document review work.</CardDescription>
            </CardHeader>
            <CardContent>
              {reviewEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No review events found in the current activity window.</p>
              ) : (
                <div className="space-y-2">
                  {reviewEvents.map((entry, index) => (
                    <div key={`${entry.timestamp}-${index}`} className="p-3 rounded-lg border border-border flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{entry.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.caseName || 'Unspecified case'}</p>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Reviewer Guidance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use this page to monitor your workload trend. If pending review spikes, prioritize time-sensitive matters first.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ReviewStatisticsPage;
