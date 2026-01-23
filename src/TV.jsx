// src/TV.jsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { Layout1, Layout2, Layout3, Layout4 } from "./layouts";

import ScaledStage from "./ScaledStage.jsx";
import { getConfig } from "./getConfig.js";
import { supabase } from "./supabase";
import { useLogger } from "./hooks/useLogger.js";

const LAYOUTS = {
  layout1: Layout1,
  layout2: Layout2,
  layout3: Layout3,
  layout4: Layout4,
};

export default function TV() {
  const logger = useLogger('TV');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const otpParam = params.get("otp");

  const [otp, setOtp] = useState(otpParam || localStorage.getItem('tv_otp') || "");
  const [otpInput, setOtpInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!otp) {
      setLoading(false);
      return;
    }

    let alive = true;
    let contentHashRef = null;
    setLoading(true);
    setError("");

    // Save OTP to localStorage
    localStorage.setItem('tv_otp', otp);

    // Helper to create content hash for change detection
    const createContentHash = (payload) => {
      if (!payload) return null;
      return JSON.stringify({
        layoutKey: payload.layout?.layout_key,
        backgroundImage: payload.layout?.backgroundImage,
        backgroundVideo: payload.layout?.backgroundVideo,
        guestId: payload.guest?.id,
        updatedAt: payload.layout?.updatedAt
      });
    };

    // Initial config fetch
    getConfig(otp)
      .then((payload) => {
        if (!alive) return;
        // payload shape: { guest, layout: {...} }
        logger.info('TV loaded config', { layoutKey: payload?.layout?.layout_key, guestId: payload?.guest?.id });
        setConfig(payload);
        contentHashRef = createContentHash(payload);
        setError("");
      })
      .catch((e) => {
        if (!alive) return;
        const errorMsg = e?.message || "Failed to load config";
        setError(errorMsg);
        // If invalid OTP, clear from localStorage
        if (errorMsg.includes('Invalid OTP')) {
          localStorage.removeItem('tv_otp');
          setOtp("");
        }
      })
      .finally(() => alive && setLoading(false));

    // Ping server every minute to update online status
    const pingInterval = setInterval(async () => {
      if (!alive) return;

      try {
        await supabase.rpc('ping_tv_device', { p_otp: otp });
      } catch (e) {
        logger.error('Failed to ping server', { error: e });
      }
    }, 60 * 1000); // 1 minute

    // Content polling - check for updates every 5 minutes
    const contentPollInterval = setInterval(async () => {
      if (!alive) return;

      try {
        const payload = await getConfig(otp);
        if (!alive) return;

        const newHash = createContentHash(payload);
        if (newHash !== contentHashRef) {
          logger.info('Content updated', { time: new Date().toLocaleTimeString() });
          setConfig(payload);
          contentHashRef = newHash;
        }
      } catch (e) {
        logger.error('Content poll error', { error: e });
        // Don't clear OTP on poll errors - might be temporary
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Refresh weather every 30 minutes (weather data changes less frequently)
    const weatherRefreshInterval = setInterval(() => {
      if (!alive) return;

      getConfig(otp)
        .then((payload) => {
          if (!alive) return;
          logger.debug('Weather refreshed', { time: new Date().toLocaleTimeString() });
          setConfig(payload);
          contentHashRef = createContentHash(payload);
        })
        .catch((e) => {
          logger.error('Failed to refresh weather', { error: e });
        });
    }, 30 * 60 * 1000); // 30 minutes

    return () => {
      alive = false;
      clearInterval(pingInterval);
      clearInterval(contentPollInterval);
      clearInterval(weatherRefreshInterval);
    };
  }, [otp]);

  const handlePairDevice = (e) => {
    e.preventDefault();
    if (!otpInput.trim()) {
      setError("Please enter an OTP code");
      return;
    }
    setOtp(otpInput.trim());
    navigate(`/tv?otp=${otpInput.trim()}`);
  };

  // Show pairing screen if no OTP
  if (!otp) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "1rem",
            padding: "3rem",
            maxWidth: "28rem",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div
            style={{
              width: "4rem",
              height: "4rem",
              background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
              borderRadius: "1rem",
              margin: "0 auto 1.5rem",
            }}
          />
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #1e40af 0%, #6366f1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "0.5rem",
            }}
          >
            Pair Your TV
          </h1>
          <p style={{ color: "#64748b", marginBottom: "2rem" }}>
            Enter the 6-digit OTP code from your BizScreen dashboard
          </p>

          <form onSubmit={handlePairDevice}>
            <input
              type="text"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.toUpperCase())}
              placeholder="Enter OTP Code"
              maxLength={6}
              autoFocus
              style={{
                width: "100%",
                padding: "1rem",
                fontSize: "1.5rem",
                textAlign: "center",
                letterSpacing: "0.5rem",
                border: "2px solid #e2e8f0",
                borderRadius: "0.5rem",
                marginBottom: "1rem",
                fontFamily: "monospace",
              }}
            />
            {error && (
              <p style={{ color: "#ef4444", marginBottom: "1rem", fontSize: "0.875rem" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "1rem",
                background: loading ? "#94a3b8" : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "1.125rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Pairing..." : "Pair Device"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const key = config?.layout?.layout_key || "layout1";
  const Active = LAYOUTS[key] || Layout1;

  // Background image from config, fallback empty
  const bgImage = config?.layout?.backgroundImage || "";

  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "1.5rem",
        }}
      >
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          fontSize: "1.25rem",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div>
          <p>{error}</p>
          <button
            onClick={() => {
              localStorage.removeItem('tv_otp');
              setOtp("");
              setError("");
            }}
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1.5rem",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ padding: 24, color: "white", backgroundColor: "#000" }}>
        No configuration found
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000",
        backgroundImage: bgImage ? `url(${bgImage})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Fit the designed 16:9 canvas to any screen */}
      <ScaledStage baseWidth={1920} baseHeight={1080}>
        <Active layout={config.layout} guest={config.guest} />
      </ScaledStage>
    </div>
  );
}
