import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function ProjectsScreen() {
  return (
    <Screen>
      <ScreenHeader
        subtitle="A quiet home for outcomes larger than a single action."
        title="Projects"
      />
      <EmptyState
        icon="layers-outline"
        message="Projects will turn meaningful outcomes into clear next actions. For now, capture what is on your mind."
        title="Built for the next layer"
      />
    </Screen>
  );
}
