const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const scannerDb = new Database(path.join(__dirname, 'scanner', 'edges.db'));
const oracleDb = new Database(path.join(__dirname, 'oracle', 'oracles.db'));

// Scanner endpoints
app.get('/api/scanner/metrics', (req, res) => {
  try {
    const stats = scannerDb.prepare(`
      SELECT 
        COUNT(*) as total,
        AVG(ev) as avgEV,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
        COUNT(CASE WHEN timestamp > datetime('now', '-30 days') THEN 1 END) as thisMonth
      FROM edges
    `).get();

    const hitRate = stats.total > 0 ? (stats.converted / stats.total * 100) : 0;
    const conversion = stats.total > 0 ? (stats.converted / stats.total * 100) : 0;

    res.json({
      alertsThisMonth: stats.thisMonth || 0,
      avgEV: stats.avgEV || 0,
      hitRate: hitRate,
      conversion: conversion,
      avgLatency: '0.3s',
      activeScans: 1
    });
  } catch (error) {
    console.error('Scanner metrics error:', error);
    res.json({
      alertsThisMonth: 0,
      avgEV: 0,
      hitRate: 0,
      conversion: 0,
      avgLatency: '0s',
      activeScans: 0
    });
  }
});

app.get('/api/scanner/alerts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const alerts = scannerDb.prepare(`
      SELECT * FROM edges 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit);

    res.json(alerts.map(alert => ({
      id: alert.id || alert.market_id,
      title: alert.title || alert.market_title,
      outcome: alert.outcome,
      ev: alert.ev,
      marketPrice: alert.market_price,
      trueProb: alert.true_prob,
      liquidity: alert.liquidity,
      timestamp: new Date(alert.timestamp).getTime(),
      status: alert.status || 'active'
    })));
  } catch (error) {
    console.error('Scanner alerts error:', error);
    res.json([]);
  }
});

app.post('/api/scanner/backtest', (req, res) => {
  try {
    const stats = scannerDb.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as profitable,
        AVG(CASE WHEN status = 'converted' THEN ev ELSE 0 END) as avgProfit
      FROM edges
    `).get();

    res.json({
      totalOpportunities: stats.total || 0,
      profitableEdges: stats.profitable || 0,
      avgProfit: stats.avgProfit || 0,
      totalProfit: (stats.profitable || 0) * (stats.avgProfit || 0),
      hitRate: stats.total > 0 ? (stats.profitable / stats.total * 100) : 0,
      hits: stats.profitable || 0,
      total: stats.total || 0
    });
  } catch (error) {
    console.error('Backtest error:', error);
    res.json({
      totalOpportunities: 0,
      profitableEdges: 0,
      avgProfit: 0,
      totalProfit: 0
    });
  }
});

// Oracle endpoints
app.get('/api/oracle/stats', (req, res) => {
  try {
    const stats = oracleDb.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'DISPUTED' THEN 1 END) as disputed,
        COUNT(CASE WHEN status = 'CONSENSUS' THEN 1 END) as consensus,
        COUNT(CASE WHEN timestamp > datetime('now', '-24 hours') THEN 1 END) as alerts24h
      FROM oracles
    `).get();

    res.json({
      marketsTracked: stats.total || 0,
      totalAlerts: stats.alerts24h || 0,
      consensusDetected: stats.consensus || 0,
      disputed: stats.disputed || 0,
      autoBets: 0,
      winRate: 0,
      edgeTime: '10s'
    });
  } catch (error) {
    console.error('Oracle stats error:', error);
    res.json({
      marketsTracked: 0,
      totalAlerts: 0,
      consensusDetected: 0,
      disputed: 0,
      autoBets: 0,
      winRate: 0,
      edgeTime: '0s'
    });
  }
});

app.get('/api/oracle/markets', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const markets = oracleDb.prepare(`
      SELECT * FROM oracles 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit);

    res.json(markets.map(m => ({
      marketId: m.market_id,
      title: m.title,
      status: m.status || 'MONITORING',
      consensus: m.consensus || 0,
      outcome: m.outcome || 'N/A',
      proposer: m.proposer || 'N/A',
      lastUpdate: new Date(m.timestamp).getTime(),
      alerts: m.disputes || '0',
      liquidity: m.liquidity || 0
    })));
  } catch (error) {
    console.error('Oracle markets error:', error);
    res.json([]);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API Server running on port ${PORT}`);
  console.log(`📊 Scanner DB: ${scannerDb.name}`);
  console.log(`🔮 Oracle DB: ${oracleDb.name}`);
});
