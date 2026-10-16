import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const EDIT_SPACES_EXIT_TEXT = {
  message: "you moved, hid or showed spaces while editing. keep the new layout?",
  keepEditing: "keep editing",
  discard: "discard changes",
  keep: "keep changes",
} as const;

interface EditSpacesExitDialogProps {
  isOpen: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
  onKeep: () => void;
}

export function EditSpacesExitDialog({
  isOpen,
  onKeepEditing,
  onDiscard,
  onKeep,
}: EditSpacesExitDialogProps) {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onKeepEditing();
      }}
    >
      <AlertDialogContent>
        <AlertDialogDescription className="text-xs">
          {EDIT_SPACES_EXIT_TEXT.message}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel size="xs">{EDIT_SPACES_EXIT_TEXT.keepEditing}</AlertDialogCancel>
          <Button type="button" variant="outline" size="xs" onClick={onDiscard}>
            {EDIT_SPACES_EXIT_TEXT.discard}
          </Button>
          <AlertDialogAction size="xs" onClick={onKeep}>
            {EDIT_SPACES_EXIT_TEXT.keep}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
