import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { SelectField } from '../components/ui/SelectField';
import { ErrorState } from '../components/ui/ErrorState';
import { Badge } from '../components/ui/Badge';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { analyticsService, TeamMemberPerformance, DailyProgress } from '../services/analytics.service';
import api from '../services/api';

interface CaseOption {
  id: string;
  caseName: string;
  caseNumber: string;
}

const TeamPerformancePage = () => {
  const { hasFullAccess } = useRole();
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [teamPerformance, setTeamPerformance] = useState<TeamMemberPerformance[]>([]);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCases = async () => {
      if (!hasFullAccess) {
        return;
      }

      setIsLoadingCases(true);
      setError(null);

      try {
        const response = await api.get('/cases', {
          params: {
            status: 'ACTIVE',
            page: 1,
            limit: 100,
            sortBy: 'createdAt',
            sortOrder: 'desc'
          }
        });

        const options: CaseOption[] = (response.data.cases || []).map((caseItem: any) => ({
          id: caseItem.id || caseItem._id,
          caseName: caseItem.caseName,
          caseNumber: caseItem.caseNumber
        }));

        setCases(options);
        if (options.length > 0) {
          setSelectedCaseId(options[0].id);
        }
      } catch {
        setError('Unable to load cases for team performance.');
      } finally {
        setIsLoadingCases(false);
      }
    };

    loadCases();
  }, [hasFullAccess]);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!selectedCaseId) {
        setTeamPerformance([]);
        setDailyProgress([]);
        return;
      }

      setIsLoadingMetrics(true);
      setError(null);

      try {
        const [teamData, progressData] = await Promise.all([
          analyticsService.getTeamPerformance(selectedCaseId),
          analyticsService.getDailyProgress(selectedCaseId, 14)
        ]);
        setTeamPerformance(teamData);
        setDailyProgress(progressData);
      } catch {
        setError('Unable to load team metrics for the selected case.');
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    loadMetrics();
  }, [selectedCaseId]);

  const totals = useMemo(() => {
    const reviewed = teamPerformance.reduce((sum, member) => sum + member.documentsReviewed, 0);
    const avgMinutes = teamPerformance.length > 0
      ? teamPerformance.reduce((sum, member) => sum + member.avgTimePerDoc, 0) / teamPerformance.length
      : 0;

    const recentReviewed = dailyProgress.reduce((sum, day) => sum + day.reviewed, 0);

    return {
      reviewed,
      avgMinutes,
      recentReviewed,
      teamMembers: teamPerformance.length,
    };
  }, [teamPerformance, dailyProgress]);

  if (!hasFullAccess) {
    return <PermissionDenied requiredRole="ADMIN or PARTNER" />;
  }

  if (error && !isLoadingCases && !isLoadingMetrics) {
    return (
      <ErrorState
        title="Unable to load team performance"
        message={error}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Team Performance</h1>
        <p className="text-muted-foreground mt-1">Track reviewer output and daily progress across active matters.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Case Scope
          </CardTitle>
          <CardDescription>Select a case to inspect team productivity metrics.</CardDescription>
        </CardHeader>
        <CardContent>
          <SelectField
            value={selectedCaseId}
            onChange={(event) => setSelectedCaseId(event.target.value)}
            disabled={isLoadingCases || cases.length === 0}
          >
            {cases.length === 0 ? (
              <option value="">No active cases available</option>
            ) : (
              cases.map((caseOption) => (
                <option key={caseOption.id} value={caseOption.id}>
                  {caseOption.caseNumber} - {caseOption.caseName}
                </option>
              ))
            )}
          </SelectField>
        </CardContent>
      </Card>

      {(isLoadingCases || isLoadingMetrics) ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-primary/10"><CardContent className="p-4"><p className="text-xs text-primary font-bold uppercase">Team Members</p><p className="text-2xl font-bold">{totals.teamMembers}</p></CardContent></Card>
            <Card className="bg-success/10"><CardContent className="p-4"><p className="text-xs text-success font-bold uppercase">Reviewed Docs</p><p className="text-2xl font-bold">{totals.reviewed.toLocaleString()}</p></CardContent></Card>
            <Card className="bg-warning/10"><CardContent className="p-4"><p className="text-xs text-warning font-bold uppercase">14-Day Throughput</p><p className="text-2xl font-bold">{totals.recentReviewed.toLocaleString()}</p></CardContent></Card>
            <Card className="bg-purple/10"><CardContent className="p-4"><p className="text-xs text-purple font-bold uppercase">Avg Time / Doc</p><p className="text-2xl font-bold">{totals.avgMinutes.toFixed(1)} min</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Reviewer Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team performance data found for this case.</p>
              ) : (
                <div className="space-y-3">
                  {teamPerformance.map((member) => (
                    <div key={member.userId} className="p-3 rounded-lg border border-border flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{member.userName}</p>
                        <Badge variant="outline" className="mt-1">{member.role}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Reviewed</p>
                        <p className="font-bold text-foreground">{member.documentsReviewed.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Avg Time / Doc</p>
                        <p className="font-bold text-foreground">{member.avgTimePerDoc.toFixed(1)} min</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TeamPerformancePage;
