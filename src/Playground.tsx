import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Container
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// -------------------- config/types --------------------
const BASE = "/iot" as const;

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type Doc = { _id: string } & Record<string, unknown>;

type LogEntryT = {
  method: HttpMethod;
  url: string;
  status: number;
  ok: boolean;
  body: unknown;
  time: string;
};

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: "#4ade80",
  POST: "#fb923c",
  DELETE: "#f87171",
  PUT: "#a78bfa",
};

const ts = (): string => new Date().toLocaleTimeString();

// -------------------- helpers --------------------
function safeJsonParse(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

function omitKeys<T extends Record<string, unknown>>(obj: T, keys: string[]): Record<string, unknown> {
  const s = new Set(keys);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !s.has(k)));
}

function MethodChip({ method }: { method: HttpMethod }) {
  const color = METHOD_COLOR[method] ?? "#64748b";
  return (
    <Chip
      size="small"
      label={method}
      sx={{
        fontWeight: 800,
        border: `1px solid ${color}66`,
        color,
        backgroundColor: `${color}22`,
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      }}
    />
  );
}

// -------------------- component --------------------
type PlaygroundProps = {
  collection: string;
  polling: boolean;
};

export default function Playground({ collection, polling }: PlaygroundProps){
  const [jsonInput, setJsonInput] = useState<string>(
    '{\n  "device_id": "esp32-01",\n  "temp": 24.5,\n  "humidity": 60\n}'
  );

  const [updateId, setUpdateId] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string>("");
  const [fetchId, setFetchId] = useState<string>("");

  const [docs, setDocs] = useState<Doc[]>([]);
  const [log, setLog] = useState<LogEntryT[]>([]);
  const [jsonError, setJsonError] = useState<string>("");

  // Focus mode
  const [focusOpen, setFocusOpen] = useState<boolean>(false);
  const [focusId, setFocusId] = useState<string>("");
  const [focusDoc, setFocusDoc] = useState<Doc | null>(null);
  const [focusError, setFocusError] = useState<string>("");

  const pollingRef = useRef<number | null>(null);
  const focusPollingRef = useRef<number | null>(null);

  const endpointBase = useMemo(() => `${BASE}/${collection}`, [collection]);

  const call = async <TResponse = unknown,>(method: HttpMethod, path: string, body?: unknown): Promise<TResponse> => {
    const url = `${endpointBase}${path}`;
    const init: RequestInit = { method };

    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);
    const json: unknown = await res.json().catch(() => ({}));

    setLog((prev) => [{ method, url, status: res.status, ok: res.ok, body: json, time: ts() }, ...prev].slice(0, 50));
    return json as TResponse;
  };

  const loadAll = async (): Promise<void> => {
    const d = await call<unknown>("GET", "/all");
    if (Array.isArray(d)) {
      const maybeDocs = d.filter(
        (x): x is Doc => typeof x === "object" && x !== null && typeof (x as any)._id === "string"
      );
      setDocs(maybeDocs);
    } else {
      setDocs([]);
    }
  };

  const loadOne = async (id: string): Promise<void> => {
    setFocusError("");
    const d = await call<unknown>("GET", `/${encodeURIComponent(id)}`);

    if (typeof d === "object" && d !== null && typeof (d as any)._id === "string") {
      const doc = d as Doc;
      setFocusDoc(doc);

      setDocs((prev) => {
        const idx = prev.findIndex((x) => x._id === doc._id);
        if (idx === -1) return prev;
        const next = prev.slice();
        next[idx] = doc;
        return next;
      });
      return;
    }

    setFocusDoc(null);
    setFocusError("Record not found or invalid response.");
  };

  const parseJsonBody = (): unknown | null => {
    const parsed = safeJsonParse(jsonInput);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return null;
    }
    setJsonError("");
    return parsed.value;
  };

  const handleCreate = async (): Promise<void> => {
    const b = parseJsonBody();
    if (b === null) return;
    await call("POST", "", b);
    await loadAll();
  };

  const handleUpsert = async (): Promise<void> => {
    const b = parseJsonBody();
    if (b === null) return;
    await call("POST", "/upsert", b);
    await loadAll();
  };

  const handleUpdate = async (): Promise<void> => {
    const id = updateId.trim();
    if (!id) return;
    const b = parseJsonBody();
    if (b === null) return;

    // Matches your examples: /iot/{collection}/{id}/update
    await call("POST", `/${encodeURIComponent(id)}/update`, b);
    await loadAll();
  };

  const handleDelete = async (id?: string): Promise<void> => {
    const finalId = (id ?? deleteId).trim();
    if (!finalId) return;
    await call("DELETE", `/${encodeURIComponent(finalId)}/delete`);
    await loadAll();

    if (focusOpen && focusId === finalId) {
      setFocusDoc(null);
      setFocusError("Deleted.");
    }
  };

  const handleFetch = async (): Promise<void> => {
    const id = fetchId.trim();
    if (id) await call("GET", `/${encodeURIComponent(id)}`);
    else await loadAll();
  };

  const openFocus = async (id: string): Promise<void> => {
    const clean = id.trim();
    if (!clean) return;
    setFocusId(clean);
    setFocusOpen(true);
    await loadOne(clean);
  };

  const closeFocus = (): void => {
    setFocusOpen(false);
    setFocusId("");
    setFocusDoc(null);
    setFocusError("");
  };

  // initial load when collection changes
  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  // global polling
  useEffect(() => {
    if (polling) {
      pollingRef.current = window.setInterval(() => void loadAll(), 2000);
    } else if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, collection]);

  // focus mode polling
  useEffect(() => {
    if (focusPollingRef.current !== null) {
      window.clearInterval(focusPollingRef.current);
      focusPollingRef.current = null;
    }
    if (!focusOpen || !focusId) return;

    focusPollingRef.current = window.setInterval(() => void loadOne(focusId), 1000);

    return () => {
      if (focusPollingRef.current !== null) {
        window.clearInterval(focusPollingRef.current);
        focusPollingRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOpen, focusId, collection]);

  return (
    <Container maxWidth={false} sx={{ py: 2 }}>
      <Grid container spacing={2}>
        {/* LEFT */}
        <Grid item xs={12} md={4} lg={3}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
            <Typography variant="overline" sx={{ color: "#94a3b8", fontWeight: 800 }}>
              JSON Body
            </Typography>

            <TextField
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              multiline
              minRows={9}
              fullWidth
              sx={{
                mt: 1,
                "& .MuiInputBase-root": { color: "#e2e8f0", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12 },
                "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
              }}
            />

            {jsonError && (
              <Typography variant="caption" sx={{ color: "#f87171", display: "block", mt: 0.5 }}>
                {jsonError}
              </Typography>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button fullWidth variant="outlined" onClick={() => void handleCreate()} sx={{ textTransform: "none" }}>
                POST create
              </Button>
              <Button fullWidth variant="outlined" onClick={() => void handleUpsert()} sx={{ textTransform: "none", borderColor: "#a78bfa66", color: "#a78bfa" }}>
                POST upsert
              </Button>
            </Stack>

            <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.08)" }} />

            <Stack spacing={2}>
              <Card variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
                <CardContent>
                  <Typography variant="overline" sx={{ color: "#94a3b8", fontWeight: 800 }}>
                    Update by ID
                  </Typography>
                  <TextField
                    value={updateId}
                    onChange={(e) => setUpdateId(e.target.value)}
                    placeholder="_id"
                    fullWidth
                    size="small"
                    sx={{
                      mt: 1,
                      "& .MuiInputBase-root": { color: "#e2e8f0" },
                      "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                    }}
                  />
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button fullWidth variant="outlined" onClick={() => void handleUpdate()} sx={{ textTransform: "none", borderColor: "#fb923c66", color: "#fb923c" }}>
                    POST update
                  </Button>
                </CardActions>
              </Card>

              <Card variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
                <CardContent>
                  <Typography variant="overline" sx={{ color: "#94a3b8", fontWeight: 800 }}>
                    Delete by ID
                  </Typography>
                  <TextField
                    value={deleteId}
                    onChange={(e) => setDeleteId(e.target.value)}
                    placeholder="_id"
                    fullWidth
                    size="small"
                    sx={{
                      mt: 1,
                      "& .MuiInputBase-root": { color: "#e2e8f0" },
                      "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                    }}
                  />
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button fullWidth variant="outlined" onClick={() => void handleDelete()} sx={{ textTransform: "none", borderColor: "#f8717166", color: "#f87171" }}>
                    DELETE
                  </Button>
                </CardActions>
              </Card>

              <Card variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
                <CardContent>
                  <Typography variant="overline" sx={{ color: "#94a3b8", fontWeight: 800 }}>
                    Fetch
                  </Typography>
                  <TextField
                    value={fetchId}
                    onChange={(e) => setFetchId(e.target.value)}
                    placeholder="_id (blank = all)"
                    fullWidth
                    size="small"
                    sx={{
                      mt: 1,
                      "& .MuiInputBase-root": { color: "#e2e8f0" },
                      "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                    }}
                  />
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button fullWidth variant="outlined" onClick={() => void handleFetch()} sx={{ textTransform: "none", borderColor: "#4ade8066", color: "#4ade80" }}>
                    GET
                  </Button>
                </CardActions>
              </Card>
            </Stack>
          </Paper>
        </Grid>

        {/* MIDDLE */}
        <Grid item xs={12} md={8} lg={6}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="overline" sx={{ color: "#94a3b8", fontWeight: 800 }}>
                {docs.length} Documents — {collection}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button variant="outlined" size="small" onClick={() => void loadAll()} sx={{ textTransform: "none" }}>
                Refresh
              </Button>
            </Stack>

            <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.08)" }} />

            {docs.length === 0 ? (
              <Typography sx={{ color: "#334155", textAlign: "center", py: 6 }}>
                No documents yet. Use the controls to insert one.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {docs.map((doc) => {
                  const payload = omitKeys(doc as Record<string, unknown>, ["_id"]);
                  return (
                    <Card key={doc._id} variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
                      <CardContent sx={{ pb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Chip
                            size="small"
                            label={doc._id}
                            variant="outlined"
                            sx={{
                              color: "#4ade80",
                              borderColor: "#4ade8055",
                              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                              maxWidth: "100%",
                            }}
                          />
                        </Stack>

                        <Paper
                          variant="outlined"
                          sx={{
                            mt: 0.5,
                            p: 1.25,
                            bgcolor: "rgba(0,0,0,0.3)",
                            borderColor: "rgba(255,255,255,0.06)",
                            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                            fontSize: 12,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            color: "#94a3b8",
                          }}
                        >
                          {JSON.stringify(payload, null, 2)}
                        </Paper>
                      </CardContent>

                      <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                        <Button size="small" variant="outlined" onClick={() => void openFocus(doc._id)} sx={{ textTransform: "none" }}>
                          Focus
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setUpdateId(doc._id);
                            const editable = omitKeys(doc as Record<string, unknown>, ["_id", "createdAt", "updatedAt"]);
                            setJsonInput(JSON.stringify(editable, null, 2));
                          }}
                          sx={{ textTransform: "none", borderColor: "#fb923c66", color: "#fb923c" }}
                        >
                          Edit
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => void handleDelete(doc._id)}
                          sx={{ textTransform: "none", borderColor: "#f8717166", color: "#f87171" }}
                        >
                          Del
                        </Button>
                      </CardActions>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* RIGHT: request log */}
        <Grid item xs={12} lg={3}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.08)" }}>
            <Stack direction="row" alignItems="center">
              <Typography variant="overline" sx={{ color: "#94a3b8", fontWeight: 800 }}>
                Request Log
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button size="small" variant="outlined" onClick={() => setLog([])} sx={{ textTransform: "none", borderColor: "#f8717166", color: "#f87171" }}>
                Clear
              </Button>
            </Stack>

            <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.08)" }} />

            {log.length === 0 ? (
              <Typography sx={{ color: "#334155", textAlign: "center", py: 4 }} variant="body2">
                No requests yet
              </Typography>
            ) : (
              <Stack spacing={1}>
                {log.map((e, i) => (
                  <Paper
                    key={i}
                    variant="outlined"
                    sx={{
                      p: 1,
                      borderLeft: `3px solid ${METHOD_COLOR[e.method] ?? "#64748b"}`,
                      borderColor: "rgba(255,255,255,0.08)",
                      bgcolor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <MethodChip method={e.method} />
                      <Tooltip title={e.url}>
                        <Typography variant="caption" sx={{ color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.url}
                        </Typography>
                      </Tooltip>
                      <Box sx={{ flex: 1 }} />
                      <Typography variant="caption" sx={{ color: e.ok ? "#4ade80" : "#f87171", fontWeight: 800 }}>
                        {e.ok ? "✓" : "✗"} {e.status}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#475569" }}>
                        {e.time}
                      </Typography>
                    </Stack>

                    <Paper
                      variant="outlined"
                      sx={{
                        mt: 1,
                        p: 1,
                        bgcolor: "rgba(0,0,0,0.28)",
                        borderColor: "rgba(255,255,255,0.06)",
                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                        fontSize: 11,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "#cbd5e1",
                      }}
                    >
                      {JSON.stringify(e.body, null, 2)}
                    </Paper>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Focus Mode Dialog */}
      <Dialog
        open={focusOpen}
        onClose={closeFocus}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: "rgba(10,15,26,0.98)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography sx={{ fontWeight: 900, flex: 1 }}>Focus Mode — {collection}</Typography>

          <Chip
            size="small"
            label={focusId || "—"}
            variant="outlined"
            sx={{
              color: "#94a3b8",
              borderColor: "rgba(255,255,255,0.15)",
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              maxWidth: 360,
            }}
          />

          <IconButton onClick={closeFocus} size="small" sx={{ color: "#94a3b8" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {focusError ? (
            <Typography sx={{ color: "#f87171" }}>{focusError}</Typography>
          ) : focusDoc ? (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                bgcolor: "rgba(0,0,0,0.35)",
                borderColor: "rgba(255,255,255,0.08)",
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 12,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#cbd5e1",
              }}
            >
              {JSON.stringify(focusDoc, null, 2)}
            </Paper>
          ) : (
            <Typography sx={{ color: "#64748b" }}>Loading…</Typography>
          )}

          <Typography variant="caption" sx={{ display: "block", mt: 1.5, color: "#475569" }}>
            Polling every 1s while Focus Mode is open.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => {
              if (!focusDoc) return;
              const editable = omitKeys(focusDoc as Record<string, unknown>, ["_id", "createdAt", "updatedAt"]);
              setUpdateId(focusDoc._id);
              setJsonInput(JSON.stringify(editable, null, 2));
            }}
            sx={{ textTransform: "none", borderColor: "#fb923c66", color: "#fb923c" }}
            disabled={!focusDoc}
          >
            Load into editor
          </Button>

          <Button
            variant="outlined"
            onClick={() => {
              if (!focusDoc) return;
              void navigator.clipboard.writeText(JSON.stringify(focusDoc, null, 2));
            }}
            sx={{ textTransform: "none" }}
            disabled={!focusDoc}
          >
            Copy JSON
          </Button>

          <Box sx={{ flex: 1 }} />

          <Button variant="outlined" onClick={() => void loadOne(focusId)} sx={{ textTransform: "none" }} disabled={!focusId}>
            Refresh now
          </Button>

          <Button
            variant="outlined"
            onClick={() => void handleDelete(focusId)}
            sx={{ textTransform: "none", borderColor: "#f8717166", color: "#f87171" }}
            disabled={!focusId}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}