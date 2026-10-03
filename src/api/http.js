export async function readJsonBody(request, limitBytes) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    if (size > limitBytes) {
      throw createHttpError(413, "body_too_large", "Request body is too large");
    }

    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (_error) {
    throw createHttpError(400, "invalid_json", "Request body must be valid JSON");
  }
}

export function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload, null, 2) + "\n");
}

export function sendText(response, statusCode, payload, contentType) {
  response.writeHead(statusCode, {
    "content-type": contentType
  });
  response.end(payload);
}

export function sendError(response, statusCode, code, message, details) {
  sendJson(response, statusCode, {
    error: {
      code: code,
      message: message,
      details: details || null
    }
  });
}

export function createHttpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
