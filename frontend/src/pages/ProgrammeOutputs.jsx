import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Layers, 
  CheckCircle2, 
  Download, 
  ArrowRight, 
  Eye, 
  Share2, 
  FileSpreadsheet, 
  Code2, 
  X,
  Workflow,
  ArrowLeft,
  Calendar,
  Home,
  Check,
  FileCheck
} from 'lucide-react';
import { getEncounterOutputs } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';

export default function ProgrammeOutputs({ outputs: propOutputs, encounterId: propEncounterId, householdId: propHouseholdId, onNavigate }) {
  const { id: routeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const activeEncId = propEncounterId || routeId || location.state?.encounterId;
  const activeHhId = propHouseholdId || location.state?.householdId || 'H1024';

  const [outputs, setOutputs] = useState(propOutputs || location.state?.outputs || []);
  const [loading, setLoading] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState(null);

  useEffect(() => {
    if ((!outputs || outputs.length === 0) && activeEncId) {
      setLoading(true);
      getEncounterOutputs(activeEncId)
        .then(res => {
          setOutputs(res.outputs || []);
        })
        .catch(err => {
          console.error("Failed to fetch encounter outputs:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [activeEncId]);

  const getCardStyle = (code) => {
    switch (code) {
      case 'MATERNAL_HEALTH':
        return { badge: 'Maternal Register', variant: 'danger' };
      case 'IMMUNISATION':
        return { badge: 'Immunisation Register', variant: 'warning' };
      case 'HOUSEHOLD_REGISTER':
        return { badge: 'Census Register', variant: 'teal' };
      case 'FOLLOW_UP':
        return { badge: 'Follow-up Protocol', variant: 'info' };
      default:
        return { badge: 'Health Record', variant: 'neutral' };
    }
  };

  const handleExportSingle = (output, format) => {
    const filename = `${output.programme_code}_${activeHhId}.${format}`;
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(output.payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } else {
      const rows = [['Field', 'Value']];
      Object.entries(output.payload).forEach(([k, v]) => {
        rows.push([k, typeof v === 'object' ? JSON.stringify(v) : v]);
      });
      const csvContent = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    }
  };

  const handleExportAll = () => {
    const bundle = {
      encounter_id: activeEncId,
      household_id: activeHhId,
      generated_at: new Date().toISOString(),
      records: outputs.reduce((acc, o) => {
        acc[o.programme_code] = o.payload;
        return acc;
      }, {})
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ASHA_OneCapture_Encounter_${activeEncId || 'Output'}_AllRecords.json`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Hero Header Card */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl p-7 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
              Deterministic Output Generation
            </span>
            <span className="text-xs text-teal-200">Encounter #{activeEncId || '101'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            1 Visit → {outputs.length} Standardized Health Records
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 leading-relaxed">
            Frontline encounter captured once and automatically parsed into interoperable public-health registers with zero duplicate typing.
          </p>

          <div className="pt-4 flex items-center gap-2.5 flex-wrap">
            <Link to={activeHhId ? `/households/${activeHhId}` : '/households'}>
              <Button variant="secondary" size="sm" icon={Home}>
                View Household Profile
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleExportAll}
              className="border-white/30 text-white hover:bg-white/10 hover:text-white"
            >
              Export JSON Bundle
            </Button>

            <Link to="/dashboard">
              <Button variant="ghost" size="sm" icon={ArrowLeft} className="text-teal-100 hover:text-white hover:bg-white/10">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">
          <div className="w-9 h-9 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-slate-600">Loading generated programme records...</p>
        </div>
      ) : outputs.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-3">
            <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-800">No programme records found for this encounter.</p>
            <Link to="/encounters/new">
              <Button variant="primary" size="sm" icon={ArrowRight}>
                Start New Encounter Visit
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        /* Generated Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outputs.map((output) => {
            const style = getCardStyle(output.programme_code);
            return (
              <Card
                key={output.id || output.programme_code}
                className="flex flex-col justify-between hover:border-teal-200 transition shadow-xs"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={style.variant}>{style.badge}</Badge>
                    <Badge variant="success" dot>Ready for Ingestion</Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{output.programme_name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{output.programme_code}</p>
                  </div>

                  {/* Key fields preview table */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                    {Object.entries(output.payload || {}).slice(0, 5).map(([k, v], idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-mono">{k}:</span>
                        <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={Eye}
                    onClick={() => setSelectedPayload(output)}
                  >
                    Inspect Payload
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="xs"
                      icon={FileSpreadsheet}
                      onClick={() => handleExportSingle(output, 'csv')}
                    >
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      icon={Code2}
                      onClick={() => handleExportSingle(output, 'json')}
                    >
                      JSON
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* JSON Payload Inspection Modal */}
      <Modal
        isOpen={!!selectedPayload}
        onClose={() => setSelectedPayload(null)}
        title={selectedPayload ? `Payload: ${selectedPayload.programme_name}` : 'Payload Inspection'}
        subtitle={selectedPayload ? `Schema: ${selectedPayload.programme_code}` : ''}
        size="lg"
        actions={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPayload(null)}
            >
              Close
            </Button>
            {selectedPayload && (
              <Button
                variant="primary"
                size="sm"
                icon={Download}
                onClick={() => handleExportSingle(selectedPayload, 'json')}
              >
                Download JSON
              </Button>
            )}
          </div>
        }
      >
        {selectedPayload && (
          <pre className="p-4 bg-slate-900 text-teal-300 rounded-xl text-xs font-mono overflow-auto max-h-96">
            {JSON.stringify(selectedPayload.payload, null, 2)}
          </pre>
        )}
      </Modal>
    </div>
  );
}

