import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  Target, 
  Brain,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { useStudyStatistics, StudyStatistics } from '@/hooks/useStudyStatistics';
import { Flashcard, Deck } from '@/types/flashcard';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudyStatisticsProps {
  cards: Flashcard[];
  decks: Deck[];
  onBack: () => void;
}

const STATE_COLORS = {
  new: 'hsl(210, 100%, 50%)',
  learning: 'hsl(45, 100%, 50%)',
  review: 'hsl(120, 60%, 45%)',
  relearning: 'hsl(30, 100%, 50%)',
  suspended: 'hsl(0, 0%, 50%)',
  buried: 'hsl(270, 50%, 50%)',
};

const RATING_COLORS = {
  again: 'hsl(0, 70%, 50%)',
  hard: 'hsl(30, 70%, 50%)',
  good: 'hsl(120, 60%, 45%)',
  easy: 'hsl(200, 70%, 50%)',
};

export function StudyStatisticsPanel({ cards, decks, onBack }: StudyStatisticsProps) {
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const { statistics, isLoading } = useStudyStatistics(cards, decks, selectedDeckId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const { 
    cardsByState, 
    maturity, 
    dailyData, 
    retentionData,
    avgResponseTimeMs,
    studyTimeToday,
    reviewsByRating,
    intervalDistribution,
  } = statistics;

  // Prepare chart data
  const stateChartData = [
    { name: 'Novos', value: cardsByState.new, fill: STATE_COLORS.new },
    { name: 'Aprendendo', value: cardsByState.learning, fill: STATE_COLORS.learning },
    { name: 'Revisão', value: cardsByState.review, fill: STATE_COLORS.review },
    { name: 'Reaprendendo', value: cardsByState.relearning, fill: STATE_COLORS.relearning },
    { name: 'Suspensos', value: cardsByState.suspended, fill: STATE_COLORS.suspended },
    { name: 'Enterrados', value: cardsByState.buried, fill: STATE_COLORS.buried },
  ].filter(d => d.value > 0);

  const maturityChartData = [
    { name: 'Jovens', value: maturity.young, fill: 'hsl(45, 100%, 50%)' },
    { name: 'Maduros', value: maturity.mature, fill: 'hsl(120, 60%, 45%)' },
  ].filter(d => d.value > 0);

  const ratingChartData = [
    { name: 'Errei', value: reviewsByRating.again, fill: RATING_COLORS.again },
    { name: 'Difícil', value: reviewsByRating.hard, fill: RATING_COLORS.hard },
    { name: 'Bom', value: reviewsByRating.good, fill: RATING_COLORS.good },
    { name: 'Fácil', value: reviewsByRating.easy, fill: RATING_COLORS.easy },
  ].filter(d => d.value > 0);

  // Format daily data for charts
  const formattedDailyData = dailyData.map(d => ({
    ...d,
    dateLabel: format(parseISO(d.date), 'dd/MM', { locale: ptBR }),
  }));

  const totalReviews = reviewsByRating.again + reviewsByRating.hard + reviewsByRating.good + reviewsByRating.easy;
  const retentionRate = totalReviews > 0 
    ? Math.round(((reviewsByRating.good + reviewsByRating.easy) / totalReviews) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Estatísticas de Estudo</h2>
              <p className="text-sm text-muted-foreground">
                Análise do seu progresso
              </p>
            </div>
          </div>
        </div>

        <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os baralhos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os baralhos</SelectItem>
            {decks.filter(d => !d.parentDeckId).map(deck => (
              <SelectItem key={deck.id} value={deck.id}>
                {deck.emoji} {deck.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Brain className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cardsByState.total}</p>
                <p className="text-xs text-muted-foreground">Total de Cards</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{retentionRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Retenção</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(avgResponseTimeMs / 1000)}s</p>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{maturity.mature}</p>
                <p className="text-xs text-muted-foreground">Cards Maduros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <PieChart className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <Activity className="w-4 h-4" />
            Progresso
          </TabsTrigger>
          <TabsTrigger value="intervals" className="gap-2">
            <Calendar className="w-4 h-4" />
            Intervalos
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Cards by State */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cards por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                {stateChartData.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={stateChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {stateChartData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Nenhum card encontrado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Maturity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Maturidade (threshold: 21 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                {maturityChartData.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={maturityChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {maturityChartData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Nenhum card em revisão
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rating Distribution */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Distribuição de Respostas (últimos 30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                {ratingChartData.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ratingChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {ratingChartData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Nenhuma revisão encontrada
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          {/* Daily Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cards Revisados por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedDailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="cardsReviewed" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.2)"
                      name="Cards Revisados"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Retention Rate Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Taxa de Retenção ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedDailyData.map((d, i) => ({
                    ...d,
                    retention: retentionData[i]?.retentionRate || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value) => [`${value}%`, 'Retenção']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="retention" 
                      stroke="hsl(120, 60%, 45%)" 
                      strokeWidth={2}
                      dot={false}
                      name="Taxa de Retenção"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Study Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tempo de Estudo por Dia (minutos)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedDailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="studyTimeMinutes" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Minutos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intervals Tab */}
        <TabsContent value="intervals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição de Intervalos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intervalDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Cards"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed State Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Novos', count: cardsByState.new, color: STATE_COLORS.new },
                  { label: 'Aprendendo', count: cardsByState.learning, color: STATE_COLORS.learning },
                  { label: 'Em Revisão', count: cardsByState.review, color: STATE_COLORS.review },
                  { label: 'Reaprendendo', count: cardsByState.relearning, color: STATE_COLORS.relearning },
                  { label: 'Suspensos', count: cardsByState.suspended, color: STATE_COLORS.suspended },
                  { label: 'Enterrados', count: cardsByState.buried, color: STATE_COLORS.buried },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <span className="text-sm font-medium">{item.count}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex items-center justify-between font-medium">
                  <span>Total</span>
                  <span>{cardsByState.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
