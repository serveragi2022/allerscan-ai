// Browser helper to POST a FormData with real upload-progress signals.
// fetch() cannot tell us when the upload finished, XMLHttpRequest can.

export class ApiError extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function postForm(url, formData, { onUploaded, signal, timeoutMs = 75000 } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "text";
    xhr.timeout = timeoutMs;

    xhr.upload.onload = () => onUploaded && onUploaded();

    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // handled below
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.result) {
        resolve(body.result);
        return;
      }
      reject(
        new ApiError(body?.error?.message || "The server could not complete the scan. No result was produced.", {
          code: body?.error?.code,
          status: xhr.status,
        })
      );
    };
    xhr.onerror = () =>
      reject(new ApiError("Network error. Check your connection and try again.", { code: "NETWORK" }));
    xhr.ontimeout = () =>
      reject(new ApiError("The request timed out. Please try again.", { code: "TIMEOUT" }));
    xhr.onabort = () => reject(new ApiError("Scan cancelled.", { code: "ABORTED" }));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(formData);
  });
}
