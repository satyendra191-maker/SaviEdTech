import ExperimentJournal from '@/components/journal/ExperimentJournal';

export default function Page({ params }: { params: { experimentId: string } }) {
  return <ExperimentJournal experimentId={params.experimentId} />;
}
