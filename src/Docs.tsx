import React, { useMemo, useState } from "react";
import { Box, Button, Chip, Container, Divider, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: "#4ade80",
  POST: "#fb923c",
  DELETE: "#f87171",
  PUT: "#a78bfa",
};

const BASE_URL = "https://playground.skoegle.com" as const;

// In your URLs like:
//   /iot/iot/69c2232d42e4a7ee8b53ecad/update
// The segment "iot" is the *collection* (namespace / rack / group).
const COLLECTION_EXPLAIN = `In the URL format /iot/{collection}/..., the {collection} segment is where you divide/group records.
Example: /iot/iot/{id}/update → collection = "iot".`;

type ServerApi = {
  method: HttpMethod;
  path: string;
  desc: string;
};

const SERVER_APIS: ServerApi[] = [
  { method: "POST", path: "/iot/:collection", desc: "Create a new record (JSON body). Returns the created record." },
  { method: "GET", path: "/iot/:collection/all", desc: "Fetch all records inside the collection." },
  { method: "GET", path: "/iot/:collection/:id", desc: "Fetch a single record by _id." },
  { method: "POST", path: "/iot/:collection/:id/update", desc: "Update fields for a record by _id (JSON body)." },
  { method: "DELETE", path: "/iot/:collection/:id/delete", desc: "Delete a record by _id." },
  { method: "POST", path: "/iot/:collection/upsert", desc: "Create or update by device_id (recommended for IoT telemetry)." },
];

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

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Box sx={{ position: "relative" }}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          bgcolor: "rgba(0,0,0,0.35)",
          borderColor: "rgba(255,255,255,0.08)",
          fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 12,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "#a5f3fc",
        }}
      >
        {code}
      </Paper>

      <Button
        size="small"
        onClick={() => {
          void navigator.clipboard.writeText(code);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          minWidth: 0,
          fontSize: 11,
          textTransform: "none",
        }}
        variant={copied ? "contained" : "outlined"}
        color={copied ? "success" : "inherit"}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </Box>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="overline" sx={{ color: "#94a3b8", fontWeight: 900, letterSpacing: 1.2 }}>
      {children}
    </Typography>
  );
}

type SnippetKey =
  | "postman"
  | "nodejs"
  | "python"
  | "javascript"
  | "go"
  | "java"
  | "csharp"
  | "c"
  | "php"
  | "ruby";

export default function Docs() {
  const exampleCollection = "iot";
  const exampleId = "69c2232d42e4a7ee8b53ecad";

  const url = useMemo(
    () => ({
      create: `${BASE_URL}/iot/${exampleCollection}`,
      all: `${BASE_URL}/iot/${exampleCollection}/all`,
      one: `${BASE_URL}/iot/${exampleCollection}/${exampleId}`,
      update: `${BASE_URL}/iot/${exampleCollection}/${exampleId}/update`,
      del: `${BASE_URL}/iot/${exampleCollection}/${exampleId}/delete`,
      upsert: `${BASE_URL}/iot/${exampleCollection}/upsert`,
    }),
    []
  );

  const [snippet, setSnippet] = useState<SnippetKey>("postman");

  const snippets = useMemo<Record<SnippetKey, { title: string; code: string }>>(
    () => ({
      postman: {
        title: "Postman",
        code: `POST ${url.create}
Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "device_id": "esp32-01",
  "temp": 24.5,
  "humidity": 60
}

GET ${url.all}

POST ${url.update}
Body:
{
  "temp": 26.1
}

DELETE ${url.del}`,
      },
      nodejs: {
        title: "Node.js (axios)",
        code: `import axios from "axios";

await axios.post("${url.create}", { device_id: "esp32-01", temp: 24.5, humidity: 60 });

const all = (await axios.get("${url.all}")).data;
console.log(all);

await axios.post("${url.update}", { temp: 26.1 });

await axios.delete("${url.del}");`,
      },
      python: {
        title: "Python (requests)",
        code: `import requests

requests.post("${url.create}", json={"device_id": "esp32-01", "temp": 24.5, "humidity": 60})

all_docs = requests.get("${url.all}").json()
print(all_docs)

requests.post("${url.update}", json={"temp": 26.1})

requests.delete("${url.del}")`,
      },
      javascript: {
        title: "JavaScript (fetch)",
        code: `// Create
await fetch("${url.create}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ device_id: "esp32-01", temp: 24.5, humidity: 60 })
});

// Fetch all
const all = await fetch("${url.all}").then(r => r.json());
console.log(all);

// Update
await fetch("${url.update}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ temp: 26.1 })
});

// Delete
await fetch("${url.del}", { method: "DELETE" });`,
      },
      go: {
        title: "Go (net/http)",
        code: `package main

import (
  "bytes"
  "net/http"
)

func main() {
  body := []byte(\`{"device_id":"esp32-01","temp":24.5,"humidity":60}\`)
  http.Post("${url.create}", "application/json", bytes.NewBuffer(body))

  up := []byte(\`{"temp":26.1}\`)
  http.Post("${url.update}", "application/json", bytes.NewBuffer(up))

  req, _ := http.NewRequest("DELETE", "${url.del}", nil)
  http.DefaultClient.Do(req)
}`,
      },
      java: {
        title: "Java (HttpClient)",
        code: `import java.net.URI;
import java.net.http.*;

public class Main {
  public static void main(String[] args) throws Exception {
    HttpClient c = HttpClient.newHttpClient();

    HttpRequest create = HttpRequest.newBuilder()
      .uri(URI.create("${url.create}"))
      .header("Content-Type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString("{\\"device_id\\":\\"esp32-01\\",\\"temp\\":24.5,\\"humidity\\":60}"))
      .build();
    c.send(create, HttpResponse.BodyHandlers.ofString());

    HttpRequest update = HttpRequest.newBuilder()
      .uri(URI.create("${url.update}"))
      .header("Content-Type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString("{\\"temp\\":26.1}"))
      .build();
    c.send(update, HttpResponse.BodyHandlers.ofString());

    HttpRequest del = HttpRequest.newBuilder()
      .uri(URI.create("${url.del}"))
      .DELETE()
      .build();
    c.send(del, HttpResponse.BodyHandlers.ofString());
  }
}`,
      },
      csharp: {
        title: "C# (.NET HttpClient)",
        code: `using System.Net.Http;
using System.Text;

var http = new HttpClient();

await http.PostAsync("${url.create}",
  new StringContent("{\\"device_id\\":\\"esp32-01\\",\\"temp\\":24.5,\\"humidity\\":60}", Encoding.UTF8, "application/json"));

await http.PostAsync("${url.update}",
  new StringContent("{\\"temp\\":26.1}", Encoding.UTF8, "application/json"));

await http.DeleteAsync("${url.del}");`,
      },
      c: {
        title: "C (libcurl)",
        code: `#include <curl/curl.h>

int main() {
  CURL *curl = curl_easy_init();
  if(!curl) return 1;

  struct curl_slist *headers = NULL;
  headers = curl_slist_append(headers, "Content-Type: application/json");

  curl_easy_setopt(curl, CURLOPT_URL, "${url.create}");
  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
  curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "{\\"device_id\\":\\"esp32-01\\",\\"temp\\":24.5,\\"humidity\\":60}");
  curl_easy_perform(curl);

  curl_slist_free_all(headers);
  curl_easy_cleanup(curl);
  return 0;
}`,
      },
      php: {
        title: "PHP",
        code: `<?php
$ch = curl_init("${url.create}");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["device_id" => "esp32-01", "temp" => 24.5, "humidity" => 60]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$res = curl_exec($ch);
curl_close($ch);

echo $res;
?>`,
      },
      ruby: {
        title: "Ruby",
        code: `require "net/http"
require "json"

uri = URI("${url.create}")

req = Net::HTTP::Post.new(uri, "Content-Type" => "application/json")
req.body = { device_id: "esp32-01", temp: 24.5, humidity: 60 }.to_json

Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
  res = http.request(req)
  puts res.body
end`,
      },
    }),
    [url]
  );

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Overview */}
        <Paper variant="outlined" sx={{ p: 2.5, bgcolor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <Typography variant="h5" sx={{ fontWeight: 950 }}>
            API Documentation
          </Typography>

          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.75, lineHeight: 1.8 }}>
            Base URL:{" "}
            <Box component="span" sx={{ color: "#38bdf8", fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
              {BASE_URL}
            </Box>
          </Typography>

          <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.08)" }} />

          <SectionTitle>Collections (Namespace / Rack / Group)</SectionTitle>
          <Typography variant="body2" sx={{ color: "#94a3b8", mt: 1, lineHeight: 1.85 }}>
            {COLLECTION_EXPLAIN}
          </Typography>

          <Typography variant="body2" sx={{ color: "#94a3b8", mt: 1, lineHeight: 1.85 }}>
            Example update URL:
            <Box
              component="div"
              sx={{
                mt: 0.75,
                p: 1.25,
                bgcolor: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 1,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 12,
                color: "#cbd5e1",
                overflowX: "auto",
              }}
            >
              {url.update}
            </Box>
            <Box component="div" sx={{ mt: 0.75, color: "#64748b" }}>
              Here <code>{exampleCollection}</code> is the <b>collection</b> and <code>{exampleId}</code> is the record id.
            </Box>
          </Typography>
        </Paper>

        {/* Server APIs */}
        <Paper variant="outlined" sx={{ p: 2.5, bgcolor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <Typography variant="h6" sx={{ fontWeight: 950 }}>
            Backend IoT APIs (HTTP)
          </Typography>

          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.75, lineHeight: 1.8 }}>
            These endpoints are used by the Playground UI and also by devices/services pushing telemetry.
          </Typography>

          <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.08)" }} />

          <Stack spacing={1}>
            {SERVER_APIS.map((api, i) => (
              <Paper
                key={i}
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: "rgba(0,0,0,0.18)",
                  borderColor: "rgba(255,255,255,0.06)",
                  display: "flex",
                  gap: 1.5,
                  alignItems: "flex-start",
                }}
              >
                <MethodChip method={api.method} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }} variant="body2">
                    {api.path}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.25 }}>
                    {api.desc}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Paper>

        {/* Language switcher */}
        <Paper variant="outlined" sx={{ p: 2.5, bgcolor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <Typography variant="h6" sx={{ fontWeight: 950 }}>
            Client-Side Examples (Click to switch)
          </Typography>

          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.75, lineHeight: 1.8 }}>
            Click a button to change the example code. All examples use the same endpoints.
          </Typography>

          <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.08)" }} />

          <ToggleButtonGroup
            value={snippet}
            exclusive
            onChange={(_, v: SnippetKey | null) => {
              if (v) setSnippet(v);
            }}
            sx={{
              flexWrap: "wrap",
              gap: 1,
              "& .MuiToggleButton-root": {
                textTransform: "none",
                borderColor: "rgba(255,255,255,0.15)",
                color: "#94a3b8",
              },
              "& .Mui-selected": {
                bgcolor: "rgba(56,189,248,0.18) !important",
                borderColor: "rgba(56,189,248,0.35) !important",
                color: "#38bdf8 !important",
              },
            }}
          >
            <ToggleButton value="postman">Postman</ToggleButton>
            <ToggleButton value="nodejs">Node.js</ToggleButton>
            <ToggleButton value="python">Python</ToggleButton>
            <ToggleButton value="javascript">JavaScript</ToggleButton>
            <ToggleButton value="go">Go</ToggleButton>
            <ToggleButton value="java">Java</ToggleButton>
            <ToggleButton value="csharp">C#</ToggleButton>
            <ToggleButton value="c">C</ToggleButton>
            <ToggleButton value="php">PHP</ToggleButton>
            <ToggleButton value="ruby">Ruby</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ mt: 2 }}>
            <SectionTitle>{snippets[snippet].title}</SectionTitle>
            <CodeBlock code={snippets[snippet].code} />
          </Box>
        </Paper>

        {/* Focus mode explanation */}
        <Paper variant="outlined" sx={{ p: 2.5, bgcolor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <Typography variant="h6" sx={{ fontWeight: 950 }}>
            Focus Mode (Real-time View)
          </Typography>

          <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.08)" }} />

          <Typography variant="body2" sx={{ color: "#94a3b8", lineHeight: 1.9 }}>
            In the Playground, click <b>Focus</b> on a record to open it in a popup.
          </Typography>

          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 3, color: "#94a3b8", lineHeight: 1.9 }}>
            <li>The popup loads that single record using <code>GET /iot/{`{collection}`}/{`{id}`}</code>.</li>
            <li>While Focus Mode is open, the app polls the record every 1 second.</li>
            <li>So when a device/service updates values, you see them update automatically (near real-time).</li>
          </Box>

          <Typography variant="body2" sx={{ color: "#64748b", mt: 1.5, lineHeight: 1.9 }}>
            Tip: Use Focus Mode to validate live telemetry quickly.
          </Typography>
        </Paper>
      </Stack>
    </Container>
  );
}