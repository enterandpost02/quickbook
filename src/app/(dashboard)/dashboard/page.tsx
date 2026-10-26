import { getComputedQboState } from "@/lib/qbo-store";
import { QboWorkspace } from "@/components/qbo/qbo-workspace";

export default async function DashboardPage() {
  const initialState = getComputedQboState();
  return <QboWorkspace initialState={initialState} />;
}
