import WebSocket from "ws";

export class OcppChargePointClient {
  public readonly chargePointId: string;
  private ws: WebSocket | null = null;
  private connected: boolean = false;
  private messageCounter: number = 1;
  private pendingResolvers = new Map<string, (val: any) => void>();
  private ocppBaseUrl: string;

  constructor(chargePointId: string, ocppBaseUrl: string = "ws://localhost:4000/ocpp/1.6") {
    this.chargePointId = chargePointId;
    this.ocppBaseUrl = ocppBaseUrl.replace(/\/$/, "");
  }

  public async connect(): Promise<boolean> {
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return true;
    }

    const url = `${this.ocppBaseUrl}/${encodeURIComponent(this.chargePointId)}`;

    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(url, ["ocpp1.6", "ocpp1.6j"], {
          headers: process.env.OCPP_SHARED_SECRET
            ? { Authorization: `Bearer ${process.env.OCPP_SHARED_SECRET}` }
            : {},
        });

        ws.on("open", () => {
          this.ws = ws;
          this.connected = true;
          this.sendBootNotification().catch(() => {});
          resolve(true);
        });

        ws.on("message", (data) => {
          try {
            const frame = JSON.parse(data.toString());
            // [MessageType, UniqueId, Payload]
            if (Array.isArray(frame) && (frame[0] === 3 || frame[0] === 4)) {
              const [, msgId, payload] = frame;
              const resolver = this.pendingResolvers.get(msgId);
              if (resolver) {
                this.pendingResolvers.delete(msgId);
                resolver(payload);
              }
            }
          } catch {
            // ignore
          }
        });

        ws.on("error", () => {
          this.connected = false;
          resolve(false);
        });

        ws.on("close", () => {
          this.connected = false;
          this.ws = null;
        });
      } catch {
        resolve(false);
      }
    });
  }

  public disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
      this.connected = false;
    }
  }

  private sendCall(action: string, payload: any): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.resolve(null);
    }

    const messageId = String(this.messageCounter++);
    const frame = [2, messageId, action, payload];

    return new Promise((resolve) => {
      this.pendingResolvers.set(messageId, resolve);
      this.ws?.send(JSON.stringify(frame));
      setTimeout(() => {
        if (this.pendingResolvers.has(messageId)) {
          this.pendingResolvers.delete(messageId);
          resolve(null);
        }
      }, 5000);
    });
  }

  public async sendBootNotification(): Promise<any> {
    return this.sendCall("BootNotification", {
      chargePointVendor: "TataPower-Pulse",
      chargePointModel: "HyperCharge-DC",
      firmwareVersion: "2.1.0",
    });
  }

  public async sendStatusNotification(status: "Available" | "Occupied" | "Charging" | "Faulted" | "Unavailable"): Promise<any> {
    return this.sendCall("StatusNotification", {
      connectorId: 1,
      errorCode: status === "Faulted" ? "InternalError" : "NoError",
      status,
      timestamp: new Date().toISOString(),
    });
  }

  public async sendStartTransaction(
    meterStart: number = 0,
    idTag: string = "TAG-TWIN-DRIVER",
    source: string = "twin",
    durationMin: number = 30
  ): Promise<{ transactionId?: number }> {
    const res = await this.sendCall("StartTransaction", {
      connectorId: 1,
      idTag,
      meterStart,
      source,
      durationMin,
      timestamp: new Date().toISOString(),
    });
    return res || {};
  }

  public async sendMeterValues(transactionId: number, energyKwh: number, soc: number): Promise<any> {
    return this.sendCall("MeterValues", {
      connectorId: 1,
      transactionId,
      meterValue: [
        {
          timestamp: new Date().toISOString(),
          sampledValue: [
            {
              value: String(energyKwh),
              measurand: "Energy.Active.Import.Register",
              unit: "kWh",
            },
            {
              value: String(soc),
              measurand: "SoC",
              unit: "Percent",
            },
          ],
        },
      ],
    });
  }

  public async sendStopTransaction(transactionId: number, meterStop: number, socEnd: number = 85): Promise<any> {
    return this.sendCall("StopTransaction", {
      transactionId,
      meterStop,
      socEnd,
      timestamp: new Date().toISOString(),
      reason: "Local",
    });
  }
}
