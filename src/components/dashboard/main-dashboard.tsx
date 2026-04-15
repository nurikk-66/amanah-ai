'use client';

import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Shield, Zap, BarChart3, Upload } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface Company {
  id: string;
  name: string;
  sector: string;
  privatization_readiness_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  revenue_usd: number;
  employee_count: number;
  status: string;
}

interface DashboardProps {
  companies: Company[];
  userRole?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.23, 1, 0.82, 1] },
  },
};

const getRiskColor = (risk: string) => {
  const colors: Record<string, string> = {
    low: 'bg-amanah-500/20 text-amanah-400 border-amanah-500/50',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  };
  return colors[risk] || colors.medium;
};

const getRiskBg = (risk: string) => {
  const colors: Record<string, string> = {
    low: 'from-amanah-500/5 to-dark-800',
    medium: 'from-yellow-500/5 to-dark-800',
    high: 'from-orange-500/5 to-dark-800',
    critical: 'from-red-500/5 to-dark-800',
  };
  return colors[risk] || colors.medium;
};

export function MainDashboard({ companies, userRole = 'auditor' }: DashboardProps) {
  const [hoveredCompany, setHoveredCompany] = useState<string | null>(null);

  const metrics = [
    {
      label: 'Total Companies',
      value: companies.length,
      icon: BarChart3,
      gradient: 'from-blue-500/20 to-transparent',
    },
    {
      label: 'Ready for Audit',
      value: companies.filter((c) => c.status === 'approved' || c.status === 'in_review').length,
      icon: TrendingUp,
      gradient: 'from-amanah-500/20 to-transparent',
    },
    {
      label: 'High Risk',
      value: companies.filter((c) => c.risk_level === 'high' || c.risk_level === 'critical').length,
      icon: Shield,
      gradient: 'from-red-500/20 to-transparent',
    },
    {
      label: 'Avg. Readiness',
      value:
        Math.round(
          companies.reduce((sum, c) => sum + c.privatization_readiness_score, 0) / companies.length
        ) + '%',
      icon: Zap,
      gradient: 'from-amanah-400/20 to-transparent',
    },
  ];

  return (
    <div className="min-h-screen bg-dark-950 text-neutral-100 overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-6 py-20 sm:py-32 overflow-hidden">
        {/* Gradient background blur */}
        <motion.div
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amanah-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </motion.div>

        <motion.div
          className="max-w-6xl mx-auto relative z-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="flex justify-center mb-8"
          >
            <div className="glass px-4 py-2 inline-flex items-center gap-2 rounded-full border border-amanah-500/30">
              <Zap className="w-4 h-4 text-amanah-400" />
              <span className="text-sm font-medium text-amanah-400">
                AI-Powered Enterprise Auditing
              </span>
            </div>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-center mb-6 leading-tight"
          >
            Audit & Privatize{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amanah-400 to-amanah-300">
              State Enterprises
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl text-neutral-400 text-center max-w-3xl mx-auto mb-12"
          >
            Uncover financial inefficiencies, identify privatization readiness, and optimize Uzbekistan's state enterprises with AI-driven intelligence.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/auditor/upload">
              <button className="btn-primary flex items-center gap-2 group">
                <Upload className="w-5 h-5" />
                Start New Audit
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/dashboard">
              <button className="btn-secondary">
                View All Companies
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Metrics Section */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                className={`glass p-6 rounded-xl backdrop-blur-lg border border-neutral-700/30 bg-gradient-to-br ${metric.gradient}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 rounded-lg bg-dark-800/50">
                    <Icon className="w-6 h-6 text-amanah-400" />
                  </div>
                </div>
                <p className="text-neutral-400 text-sm font-medium mb-2">
                  {metric.label}
                </p>
                <p className="text-3xl font-bold">{metric.value}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Bento Grid: Companies */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">State Enterprises</h2>
          <p className="text-neutral-400">
            1,600+ enterprises ready for privatization assessment
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {companies.map((company, idx) => (
            <motion.div
              key={company.id}
              variants={itemVariants}
              onHoverStart={() => setHoveredCompany(company.id)}
              onHoverEnd={() => setHoveredCompany(null)}
              className={`card-hover group relative overflow-hidden ${getRiskBg(company.risk_level)}`}
              whileHover={{ y: -4 }}
            >
              {/* Hover glow effect */}
              <motion.div
                className="absolute inset-0 -z-10 opacity-0 bg-gradient-to-br from-amanah-500/10 to-transparent"
                animate={{
                  opacity: hoveredCompany === company.id ? 1 : 0,
                }}
              />

              {/* Status Badge */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold group-hover:text-amanah-400 transition-colors">
                    {company.name}
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1 capitalize">
                    {company.sector}
                  </p>
                </div>
                <span className={`badge text-xs whitespace-nowrap ${getRiskColor(company.risk_level)}`}>
                  {company.risk_level}
                </span>
              </div>

              {/* Financial Metrics */}
              <div className="space-y-3 mb-6 py-4 border-y border-neutral-700/30">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Revenue</span>
                  <span className="font-semibold">
                    ${(company.revenue_usd / 1e6).toFixed(0)}M
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Employees</span>
                  <span className="font-semibold">
                    {(company.employee_count / 1000).toFixed(1)}K
                  </span>
                </div>
              </div>

              {/* Privatization Score */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-neutral-300">
                    Privatization Readiness
                  </span>
                  <span className="text-amanah-400 font-bold">
                    {company.privatization_readiness_score}%
                  </span>
                </div>
                <div className="w-full h-2 bg-dark-800/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amanah-500 to-amanah-400 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${company.privatization_readiness_score}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <Link href={`/auditor/company/${company.id}`}>
                <button className="w-full btn-ghost text-sm justify-center group-hover:bg-dark-700 transition-colors">
                  View Details
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass p-12 rounded-2xl relative overflow-hidden border border-amanah-500/30"
        >
          {/* Background glow */}
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-amanah-500/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <h3 className="text-3xl font-bold mb-4">Ready to Audit?</h3>
            <p className="text-neutral-400 mb-8">
              Upload financial documents and get an instant AI-powered deep audit report. Our system identifies risks, financial leaks, and optimization opportunities.
            </p>
            <Link href="/auditor/upload">
              <button className="btn-primary inline-flex items-center gap-2 group">
                <Upload className="w-5 h-5" />
                Begin Audit Process
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

export default MainDashboard;
