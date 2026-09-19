import React from 'react';
import { ShieldCheck, Lock, AlertOctagon, FileCheck, CheckCircle2, Shield, Info } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

export default function PrivacySafetyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          <Badge variant="teal" size="sm">Compliance & Governance</Badge>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Privacy, Safety & Regulatory Disclosures
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Mandatory compliance framework for the Kalachakra 2K26 Healthcare & Biotech Track prototype.
        </p>
      </div>

      <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
        {/* 1. Synthetic Data Guarantee */}
        <div className="p-5 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-2 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0" />
            <span>1. Synthetic Data Guarantee</span>
          </div>
          <p className="text-amber-800 text-xs pl-6 leading-relaxed">
            This application operates strictly on synthetic, artificially generated household records. No real patient health information (PHI), real ASHA registers, or identifiable community data is stored, ingested, or processed.
          </p>
        </div>

        {/* 2. No Official Government Healthcare System Integration */}
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Lock className="w-4 h-4 text-teal-600 shrink-0" />
              <span>2. No Official Government Healthcare System Integration</span>
            </div>
            <p className="text-slate-600 text-xs pl-6 leading-relaxed">
              ASHA OneCapture is an architectural hackathon prototype demonstrating single-capture data structuring and deterministic schema mapping. It does not connect to any official government portals or production registries.
            </p>
          </CardContent>
        </Card>

        {/* 3. Non-Clinical Workflow System */}
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>3. Non-Clinical Workflow System</span>
            </div>
            <p className="text-slate-600 text-xs pl-6 leading-relaxed">
              This platform is an administrative workflow and schema transformation utility. It does NOT diagnose illnesses, prescribe medications, generate automated clinical predictions, or replace certified clinical judgment.
            </p>
          </CardContent>
        </Card>

        {/* 4. Production Deployment Requirements */}
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <FileCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>4. Production Deployment Requirements</span>
            </div>
            <p className="text-slate-600 text-xs pl-6 leading-relaxed">
              Any future transition toward real-world community healthcare piloting would require: institutional ethical board review, informed consent protocols, role-based access control, cryptographic field-level encryption, and strict adherence to national health data protection standards.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
