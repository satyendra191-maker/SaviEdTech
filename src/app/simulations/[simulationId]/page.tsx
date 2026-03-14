import SimulationEngine from '@/components/simulations/SimulationEngine';

export default async function Page(props: { params: Promise<{ simulationId: string }> }) {
  const params = await props.params;
  return <SimulationEngine simulationId={params.simulationId} />;
}
