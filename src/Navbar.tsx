import React from "react";
import { AppBar, Box, Button, Stack, Tab, Tabs, TextField, Toolbar, Typography } from "@mui/material";

export type TabKey = "playground" | "docs";

type NavbarProps = {
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;

  collection: string;
  onCollectionChange: (collection: string) => void;

  polling: boolean;
  onTogglePolling: () => void;
};

export default function Navbar(props: NavbarProps) {
  const { tab, onTabChange, collection, onCollectionChange, polling, onTogglePolling } = props;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "rgba(10,15,26,0.9)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            backgroundImage: "linear-gradient(135deg,#0ea5e9,#6366f1)",
            display: "grid",
            placeItems: "center",
            fontSize: 16,
          }}
        >
          ⚡
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 900, letterSpacing: -0.4 }} variant="subtitle1">
            IoT Playground
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748b" }}>
            Backend As Services
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ color: "#64748b" }}>
            Collection:
          </Typography>

          <TextField
            size="small"
            value={collection}
            onChange={(e) => onCollectionChange(e.target.value)}
            placeholder="devices"
            sx={{
              width: 160,
              "& .MuiInputBase-root": { color: "#e2e8f0" },
              "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
            }}
          />

          <Button
            variant="outlined"
            color={polling ? "success" : "inherit"}
            onClick={onTogglePolling}
            sx={{ textTransform: "none" }}
          >
            {polling ? "Live" : "Poll Off"}
          </Button>
        </Stack>
      </Toolbar>

      <Tabs
        value={tab}
        onChange={(_, v: TabKey) => onTabChange(v)}
        textColor="inherit"
        indicatorColor="primary"
        sx={{
          px: 2,
          "& .MuiTab-root": { textTransform: "none", color: "#94a3b8" },
          "& .Mui-selected": { color: "#38bdf8 !important" },
        }}
      >
        <Tab value="playground" label="Playground" />
        <Tab value="docs" label="API Docs" />
      </Tabs>
    </AppBar>
  );
}