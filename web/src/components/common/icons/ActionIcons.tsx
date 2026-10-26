import type { ComponentChildren } from "preact";

function Icon({ children }: { children: ComponentChildren }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const AddIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const EditIcon = () => (
  <Icon>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
);

export const DeleteIcon = () => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
);

// Show in Blender
export const EyeIcon = () => (
  <Icon>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

// Download the viewpoint's images
export const DownloadIcon = () => (
  <Icon>
    <path d="M12 4v11M7 10l5 5 5-5" />
    <path d="M5 20h14" />
  </Icon>
);

// Capture the Blender view as a new viewpoint
export const AddViewIcon = () => (
  <Icon>
    <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M12 10v6M9 13h6" />
  </Icon>
);
