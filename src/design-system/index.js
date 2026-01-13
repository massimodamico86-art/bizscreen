/**
 * BizScreen Design System
 *
 * A comprehensive component library for building premium,
 * Apple-like admin interfaces.
 *
 * Usage:
 * import { Button, Card, PageLayout } from '../design-system';
 */

// Layout Components
export {
  PageLayout,
  PageHeader,
  PageContent,
  PageSection,
  Container,
  Grid,
  Stack,
  Inline,
  Divider,
} from './components/PageLayout';

// Button
export { Button, ButtonGroup, IconButton } from './components/Button';

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardMedia,
  StatCard,
} from './components/Card';

// Form Elements
export {
  FormField,
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
} from './components/FormElements';

// Modal
export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  ConfirmDialog,
} from './components/Modal';

// Badge
export { Badge, StatusBadge } from './components/Badge';

// Alert
export { Alert, Banner } from './components/Alert';

// EmptyState
export { EmptyState, Placeholder } from './components/EmptyState';

// Tabs
export { Tabs, PillTabs } from './components/Tabs';

// Filter Components
export { FilterChips, ToggleChips } from './components/FilterChips';
export { SearchBar } from './components/SearchBar';

// Template Components
export { TemplateCard, TemplateCardGrid, TemplateCardSkeleton } from './components/TemplateCard';

// Layout Creation
export { CreateLayoutModal, ORIENTATION_PRESETS } from './components/CreateLayoutModal';

// Illustrations
export {
  PlaylistIllustration,
  ScreensIllustration,
  MediaIllustration,
  CampaignsIllustration,
  TemplatesIllustration,
  SearchIllustration,
  NotificationsIllustration,
  EmptyBoxIllustration,
} from './components/Illustrations';

// Page Transitions
export {
  PageTransition,
  StaggeredPageTransition,
  StaggeredItem,
} from './components/PageTransition';

// Motion Primitives
export {
  fadeIn,
  fadeInScale,
  slideUp,
  slideDown,
  scaleTap,
  scaleHover,
  modal,
  dropdown,
  drawer,
  pageTransition,
  staggerContainer,
  staggerItem,
  cssTransitions,
  duration,
  easing,
  createFade,
  createSlide,
} from './motion';
