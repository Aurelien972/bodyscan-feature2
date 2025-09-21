/**
 * Icon registry for consistent icon usage across the app
 * Centralizes Lucide React imports
 */
import * as L from 'lucide-react';

export const ICONS = {
  // Navigation
  Home: L.Home,
  Target: L.Target,
  Timer: L.Timer,
  Utensils: L.Utensils,
  Activity: L.Activity,
  Smile: L.Smile,
  Scan: L.Scan,
  Refrigerator: L.Refrigerator,
  Users: L.Users,

  // UI Actions
  Menu: L.Menu,
  X: L.X,
  Plus: L.Plus,
  Minus: L.Minus,
  Edit: L.Edit,
  Triangle: L.Triangle,
  Minimize2: L.Minimize2,
  Circle: L.Circle,
  BarChart3: L.BarChart3,
  GitCompare: L.GitCompare,
  LineChart: L.LineChart,
  // IMPORTANT: Timeline est parfois absent de lucide -> on alias vers History
  History: L.History,
  Timeline: L.History, // alias compatible
  Trash2: L.Trash2,
  Save: L.Save,
  Settings: L.Settings,
  Palette: L.Palette,
  RotateCcw: L.RotateCcw,

  // User & Auth
  User: L.User,
  LogIn: L.LogIn,
  LogOut: L.LogOut,
  UserPlus: L.UserPlus,

  // Status & Feedback
  Check: L.Check,
  AlertCircle: L.AlertCircle,
  Info: L.Info,
  Loader2: L.Loader2,

  // Arrows & Navigation
  ChevronLeft: L.ChevronLeft,
  ChevronRight: L.ChevronRight,
  ChevronDown: L.ChevronDown,
  ChevronUp: L.ChevronUp,
  ArrowLeft: L.ArrowLeft,
  ArrowRight: L.ArrowRight,

  // Health & Fitness
  Heart: L.Heart,
  Moon: L.Moon,
  Zap: L.Zap,
  TrendingUp: L.TrendingUp,
  Calendar: L.Calendar,
  Clock: L.Clock,

  // Communication
  MessageCircle: L.MessageCircle,
  Bell: L.Bell,
  Mail: L.Mail,
  Volume2: L.Volume2,

  // Media & Content
  Camera: L.Camera,
  Image: L.Image,
  FileText: L.FileText,
  Download: L.Download,
  Upload: L.Upload,
  PlayCircle: L.PlayCircle,
  Clapperboard: L.Clapperboard,
  PlaySquare: L.PlaySquare,

  // System
  Wifi: L.Wifi,
  WifiOff: L.WifiOff,
  Smartphone: L.Smartphone,
  Monitor: L.Monitor,
  HelpCircle: L.HelpCircle,
  Shield: L.Shield,
  Lock: L.Lock,
  Globe: L.Globe,
  Eye: L.Eye,

  // Navigation & Actions
  Search: L.Search,
  Star: L.Star,

  // Extras pour HistoryTab (petites icônes descriptives)
  Ruler: L.Ruler,     // taille
  Scale: L.Scale,     // poids (symbole de balance)
} as const;

export type IconName = keyof typeof ICONS;

// Helper pour récupérer un composant d'icône par nom
export const getIcon = (name: IconName) => ICONS[name];