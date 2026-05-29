import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Users, ShieldCheck, FileText,
  Mail, Building2, Briefcase, Hash, TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useRole } from '../hooks/useRole';
import PermissionDenied from '../components/ui/PermissionDenied';
import { ErrorState } from '../components/ui/ErrorState';
import api from '../services/api';
import { motion } from 'framer-motion';

interface Custodian {
  id: string;
  name: string;
  email: string;
  department?: string;
  title?: string;
  documentCount?: number;
}

// Generate a consistent hue from a string
const stringToHue = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const ChainOfCustodyPage = () => {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canUpload, hasFullAccess } = useRole();
  const [custodians, setCustodians] = useState<Custodian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustodians = async () => {
      if (!caseId || (!canUpload && !hasFullAccess)) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/cases/${caseId}/custodians`);
        const rawCustodians: any[] = Array.isArray(response.data) ? response.data : [];
        const mapped: Custodian[] = rawCustodians.map((c: any) => ({
          id: c.id || c._id,
          name: c.name,
          email: c.email,
          department: c.department,
          title: c.title,
          documentCount: c.documentCount || 0,
        }));
        setCustodians(mapped);
      } catch {
        setError('Unable to load custodial chain data for this case.');
      } finally {
        setIsLoading(false);
      }
    };
    loadCustodians();
  }, [caseId, canUpload, hasFullAccess]);

  const totals = useMemo(
    () => custodians.reduce((sum, c) => sum + (c.documentCount || 0), 0),
    [custodians]
  );

  const maxDocs = useMemo(
    () => Math.max(...custodians.map(c => c.documentCount || 0), 1),
    [custodians]
  );

  if (!canUpload && !hasFullAccess) {
    return <PermissionDenied requiredRole="ADMIN, PARTNER, or PARALEGAL" />;
  }

  if (error && !isLoading) {
    return <ErrorState title="Chain of custody unavailable" message={error} />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  };

  return (
    <div className="space-y-6 pb-10 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${caseId}`)} className="-ml-1 h-8 w-8" aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Chain of Custody</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Custodian ownership records and document responsibility tracking.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading custodial chain…</p>
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

          {/* ── Stat Cards ── */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-border/60 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Custodians</p>
                  <p className="text-3xl font-bold text-foreground leading-none mt-1">{custodians.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10 shrink-0">
                  <FileText className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Linked Documents</p>
                  <p className="text-3xl font-bold text-foreground leading-none mt-1">{totals.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10 shrink-0">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Avg per Custodian</p>
                  <p className="text-3xl font-bold text-foreground leading-none mt-1">
                    {custodians.length > 0 ? Math.round(totals / custodians.length) : 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Custodian Cards ── */}
          <motion.div variants={itemVariants}>
            <Card className="border border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-muted/30 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Custodian Timeline
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Current custodial owners with department metadata and document load counts.
                    </CardDescription>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/60 font-medium">
                    {custodians.length} {custodians.length === 1 ? 'custodian' : 'custodians'}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {custodians.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="p-4 rounded-full bg-muted mb-4">
                      <Users className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="font-semibold text-foreground">No custodians registered</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add custodians to this case to begin tracking document ownership.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {custodians.map((custodian, idx) => {
                      const hue = stringToHue(custodian.name);
                      const pct = Math.round(((custodian.documentCount || 0) / maxDocs) * 100);
                      return (
                        <motion.div
                          key={custodian.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5 hover:bg-muted/30 transition-colors group"
                        >
                          {/* Avatar */}
                          <div
                            className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white shadow-sm"
                            style={{ backgroundColor: `hsl(${hue}, 55%, 48%)` }}
                          >
                            {getInitials(custodian.name)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-semibold text-foreground text-sm leading-snug">{custodian.name}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3 shrink-0" />
                                {custodian.email}
                              </span>
                              {custodian.department && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  {custodian.department}
                                </span>
                              )}
                              {custodian.title && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-3 w-3 shrink-0" />
                                  {custodian.title}
                                </span>
                              )}
                            </div>

                            {/* Document load bar */}
                            <div className="flex items-center gap-2 pt-1">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[200px]">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: `hsl(${hue}, 55%, 48%)`,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground tabular-nums">
                                {pct}% of max
                              </span>
                            </div>
                          </div>

                          {/* Doc count badge */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-background shadow-sm group-hover:border-primary/30 transition-colors">
                              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-bold text-foreground tabular-nums">
                                {(custodian.documentCount || 0).toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground">docs</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Responsibility breakdown ── */}
          {custodians.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 bg-muted/30 px-6 py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Document Responsibility Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Proportional share of documents per custodian.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-5 space-y-3">
                  {[...custodians]
                    .sort((a, b) => (b.documentCount || 0) - (a.documentCount || 0))
                    .map((custodian) => {
                      const hue = stringToHue(custodian.name);
                      const sharePct = totals > 0
                        ? Math.round(((custodian.documentCount || 0) / totals) * 100)
                        : 0;
                      return (
                        <div key={custodian.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: `hsl(${hue}, 55%, 48%)` }}
                              />
                              <span className="font-medium text-foreground">{custodian.name}</span>
                              {custodian.department && (
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  · {custodian.department}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                              <span className="font-semibold text-foreground">{(custodian.documentCount || 0).toLocaleString()}</span>
                              <span>({sharePct}%)</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${sharePct}%`,
                                backgroundColor: `hsl(${hue}, 55%, 48%)`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            </motion.div>
          )}

        </motion.div>
      )}
    </div>
  );
};

export default ChainOfCustodyPage;
