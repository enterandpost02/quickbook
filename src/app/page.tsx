import { getComputedQboState } from "@/lib/qbo-store";
import { QboWorkspace } from "@/components/qbo/qbo-workspace";

export const instant = false;

export default async function HomePage() {
  const initialState = getComputedQboState();
  return <QboWorkspace initialState={initialState} />;
}
