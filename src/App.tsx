import React, { useState } from "react";
import { Box } from "@mui/material";
import Navbar, { type TabKey } from "./Navbar";
import Docs from "./Docs";
import Playground from "./Playground";

export default function App() {
  const [tab, setTab] = useState<TabKey>("playground");
  const [collection, setCollection] = useState<string>("devices");
  const [polling, setPolling] = useState<boolean>(false);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0a0f1a", color: "#e2e8f0" }}>
      <Navbar
        tab={tab}
        onTabChange={setTab}
        collection={collection}
        onCollectionChange={setCollection}
        polling={polling}
        onTogglePolling={() => setPolling((p) => !p)}
      />

      {tab === "playground" ? (
        <Playground collection={collection} polling={polling} />
      ) : (
        <Docs />
      )}
    </Box>
  );
}