import { MobileAppShell } from './src/navigation/MobileAppShell';
import { DEFAULT_API_BASE_URL } from './src/config/defaults';
import { installMonacoCancellationHandler } from './src/screens/fileEditor';

installMonacoCancellationHandler();

export default function App() {
  return <MobileAppShell initialApiBaseUrl={DEFAULT_API_BASE_URL} />;
}
