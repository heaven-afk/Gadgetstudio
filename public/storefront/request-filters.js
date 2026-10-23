export function filterRequests(
  requests,
  { kind = 'all', status = 'all', search = '' } = {},
) {
  const query = search.trim().toLocaleLowerCase('en-NG').replace(/^#/, '');
  return requests.filter((request) => {
    if (kind !== 'all' && request.kind !== kind) return false;
    if (status === 'open') {
      if (!['submitted', 'reviewing', 'quoted'].includes(request.status))
        return false;
    } else if (status !== 'all' && request.status !== status) return false;
    const fields = [
      request.id,
      request.customer,
      request.phone,
      request.device?.model,
      request.target?.name,
      ...(request.items || []).map((item) => item.name),
    ];
    return (
      !query ||
      fields.some((value) =>
        String(value || '')
          .toLocaleLowerCase('en-NG')
          .includes(query),
      )
    );
  });
}
