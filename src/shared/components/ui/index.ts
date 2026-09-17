// UI Primitives - Standardized Compound Component Exports
// Usage: import { Button, Card, Dialog, Form, Input, Select, Table, Tabs, Badge, Toast } from '@/shared/components/ui'

// Button
export { Button, buttonVariants } from "./button";
export type { ButtonProps } from "./button";

// Card
import { Card as CardBase } from "./card";
import { CardHeader } from "./card";
import { CardTitle } from "./card";
import { CardDescription } from "./card";
import { CardContent } from "./card";
import { CardFooter } from "./card";

const Card = Object.assign(CardBase, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
});
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

// Dialog
import { Dialog as DialogBase } from "./dialog";
import { DialogPortal } from "./dialog";
import { DialogOverlay } from "./dialog";
import { DialogClose } from "./dialog";
import { DialogTrigger } from "./dialog";
import { DialogContent } from "./dialog";
import { DialogHeader } from "./dialog";
import { DialogFooter } from "./dialog";
import { DialogTitle } from "./dialog";
import { DialogDescription } from "./dialog";

const Dialog = Object.assign(DialogBase, {
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Close: DialogClose,
  Trigger: DialogTrigger,
  Content: DialogContent,
  Header: DialogHeader,
  Footer: DialogFooter,
  Title: DialogTitle,
  Description: DialogDescription,
});
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

// Form
export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  useFormField,
  FormFieldWrapper,
} from "./form";

// Input
export { Input, inputVariants } from "./input";
export type { InputProps } from "./input";

// Select
import { Select as SelectBase } from "./select";
import { SelectGroup } from "./select";
import { SelectValue } from "./select";
import { SelectTrigger } from "./select";
import { SelectContent } from "./select";
import { SelectLabel } from "./select";
import { SelectItem } from "./select";
import { SelectSeparator } from "./select";
import { SelectScrollUpButton } from "./select";
import { SelectScrollDownButton } from "./select";

const Select = Object.assign(SelectBase, {
  Group: SelectGroup,
  Value: SelectValue,
  Trigger: SelectTrigger,
  Content: SelectContent,
  Label: SelectLabel,
  Item: SelectItem,
  Separator: SelectSeparator,
  ScrollUpButton: SelectScrollUpButton,
  ScrollDownButton: SelectScrollDownButton,
});
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};

// Table
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  type ColumnDef,
} from "./table";

// Tabs
import { Tabs as TabsBase } from "./tabs";
import { TabsList } from "./tabs";
import { TabsTrigger } from "./tabs";
import { TabsContent } from "./tabs";

const Tabs = Object.assign(TabsBase, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});
export { Tabs, TabsList, TabsTrigger, TabsContent };

// Badge
export { Badge, badgeVariants } from "./badge";
export type { BadgeProps } from "./badge";

// Toast
export { Toaster, toasterPresets } from "./sonner";
export type { ToastVariant } from "./sonner";

// Additional primitives (existing)
export { Label } from "./label";
export { Separator } from "./separator";
export { Checkbox } from "./checkbox";
export { RadioGroup, RadioGroupItem } from "./radio-group";
export { Switch } from "./switch";
export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./tooltip";
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuCheckboxItem } from "./dropdown-menu";
export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, SheetClose } from "./sheet";
export { Skeleton } from "./skeleton";
import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";
export { EmptyState, LoadingState };
export { Avatar, AvatarImage, AvatarFallback } from "./avatar";
export { Alert, AlertTitle, AlertDescription } from "./alert";
export { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "./alert-dialog";