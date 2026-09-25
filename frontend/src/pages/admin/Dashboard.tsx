import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  // Placeholder stats — wire these to real API calls later
  const stats = [
    { label: 'Active Tables', value: 4 },
    { label: 'Orders Today', value: 27 },
    { label: 'Pending Orders', value: 3 },
    { label: 'Revenue Today', value: '$186.50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Overview of today's restaurant activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Order list will appear here once connected to the backend.
          <Badge className="ml-2" variant="outline">Coming next</Badge>
        </CardContent>
      </Card>
    </div>
  );
}