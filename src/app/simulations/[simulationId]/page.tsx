import SimulationEngine from '@/components/simulations/SimulationEngine';

export default function Page({ params }: { params: { simulationId: string } }) {
  return <SimulationEngine simulationId={params.simulationId} />;
}
