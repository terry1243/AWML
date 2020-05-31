export function fetchText(url) {
  return fetch(url).then(function (response) {
    if (!response.ok) throw new Error(response.statusText);
    return response.text();
  });
}

export function fetchJSON(url) {
  return fetch(url).then(function (response) {
    if (!response.ok) throw new Error(response.statusText);
    return response.json();
  });
}
