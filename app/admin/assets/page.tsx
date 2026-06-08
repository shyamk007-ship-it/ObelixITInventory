"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { createAuditLog, buildAuditDescription } from "../../lib/audit";
import { getUserProfile } from "../../lib/rbac";

interface Asset {
  id: number;
  asset_name: string;
  asset_tag: string;
  category?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  status?: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("*");

      if (error) {
        console.error(error);
        return;
      }

      setAssets(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const createAsset = async () => {
    if (!assetName || !assetTag) {
      alert("Asset name and tag required");
      return;
    }

    const { data, error } = await supabase.from("assets").insert([
      {
        asset_name: assetName,
        asset_tag: assetTag,
        category,
        brand,
        model,
        serial_number: serialNumber,
        status: "Available",
      },
    ]).select();

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    const profile = await getUserProfile();
    await createAuditLog({
      action: "Created Asset",
      description: buildAuditDescription({
        event: "Created Asset",
        userName: profile?.full_name || "Unknown User",
        recordType: "asset",
        recordId: data?.[0]?.id,
        itemName: assetName,
      }),
    });

    setAssetName("");
    setAssetTag("");
    setCategory("");
    setBrand("");
    setModel("");
    setSerialNumber("");

    await loadAssets();
    alert("Asset Added");
  };

  const deleteAsset = async (id: number, name: string) => {
    const confirmDelete = confirm("Delete this asset?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    const profile = await getUserProfile();
    await createAuditLog({
      action: "Deleted Asset",
      description: buildAuditDescription({
        event: "Deleted Asset",
        userName: profile?.full_name || "Unknown User",
        recordType: "asset",
        recordId: id,
        itemName: name,
      }),
    });

    await loadAssets();
  };

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) =>
        asset.asset_name?.toLowerCase().includes(search.toLowerCase())
      ),
    [assets, search]
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Assets</h1>
        <input
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />
      </div>

      <div style={styles.form}>
        <input
          placeholder="Asset Name"
          value={assetName}
          onChange={(e) => setAssetName(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Asset Tag"
          value={assetTag}
          onChange={(e) => setAssetTag(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Serial Number"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          style={styles.input}
        />
        <button onClick={createAsset} style={styles.button}>
          Add Asset
        </button>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Asset</th>
              <th style={styles.th}>Tag</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Brand</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map((asset) => (
              <tr key={asset.id}>
                <td style={styles.td}>{asset.asset_name}</td>
                <td style={styles.td}>{asset.asset_tag}</td>
                <td style={styles.td}>{asset.category}</td>
                <td style={styles.td}>{asset.brand}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: 20,
                      background:
                        asset.status === "Assigned"
                          ? "#fee2e2"
                          : "#dcfce7",
                      color:
                        asset.status === "Assigned"
                          ? "#dc2626"
                          : "#16a34a",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    {asset.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <button
                    style={styles.delete}
                    onClick={() => deleteAsset(asset.id, asset.asset_name)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: any = {
  container: {
    padding: 30,
    background: "#f1f5f9",
    minHeight: "100vh",
    fontFamily: "Arial",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  search: {
    padding: 12,
    width: 260,
    borderRadius: 8,
    border: "1px solid #d1d5db",
  },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 30,
    background: "white",
    padding: 20,
    borderRadius: 14,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
  },
  button: {
    padding: 12,
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },
  tableWrap: {
    overflowX: "auto",
    background: "white",
    borderRadius: 14,
    padding: 20,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: 14,
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: 14,
    borderBottom: "1px solid #f1f5f9",
  },
  delete: {
    padding: "8px 14px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};
