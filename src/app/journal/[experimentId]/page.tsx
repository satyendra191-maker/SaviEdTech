import ExperimentJournal from '@/components/journal/ExperimentJournal';

export default async function Page(props: { params: Promise<{ experimentId: string }> }) {
  const params = await props.params;
  return <ExperimentJournal experimentId={params.experimentId} />;
}
