import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Gift, Heart, CreditCard, Building, Globe, Lock } from "lucide-react";

const presetAmounts = [10, 25, 50, 100, 250, 500];

const fundCategories = [
  { id: "general", name: "General Fund", description: "Support overall ministry operations" },
  { id: "missions", name: "Missions", description: "Spread the gospel worldwide" },
  { id: "building", name: "Building Fund", description: "Maintain and expand facilities" },
  { id: "outreach", name: "Community Outreach", description: "Help those in need locally" },
];

const Donate = () => {
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedFund, setSelectedFund] = useState("general");
  const [frequency, setFrequency] = useState("one-time");

  const handlePresetAmount = (value: number) => {
    setAmount(value.toString());
    setCustomAmount("");
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    setAmount("");
  };

  const displayAmount = customAmount || amount;

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 gradient-hero overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-10 left-20 w-72 h-72 rounded-full bg-accent blur-3xl animate-float" />
        </div>
        <div className="container relative z-10 text-center">
          <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground mb-4">
            <Gift className="w-3 h-3 mr-1" />
            Online Giving
          </Badge>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground mb-4">
            Give With a Generous Heart
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto">
            Your generosity helps us share God's love, support our community, and spread the gospel around the world.
          </p>
        </div>
      </section>

      {/* Donation Form */}
      <section className="py-12 md:py-16">
        <div className="container max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-3">
              <Card className="shadow-elevated">
                <CardHeader>
                  <CardTitle className="font-serif text-2xl">Make a Donation</CardTitle>
                  <CardDescription>Choose an amount and fund to support</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Frequency */}
                  <div>
                    <Label className="mb-3 block">Giving Frequency</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={frequency === "one-time" ? "gold" : "outline"}
                        onClick={() => setFrequency("one-time")}
                        className="flex-1"
                      >
                        One-Time
                      </Button>
                      <Button
                        variant={frequency === "monthly" ? "gold" : "outline"}
                        onClick={() => setFrequency("monthly")}
                        className="flex-1"
                      >
                        Monthly
                      </Button>
                    </div>
                  </div>

                  {/* Amount Selection */}
                  <div>
                    <Label className="mb-3 block">Select Amount</Label>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {presetAmounts.map((preset) => (
                        <Button
                          key={preset}
                          variant={amount === preset.toString() ? "gold" : "outline"}
                          onClick={() => handlePresetAmount(preset)}
                          className="h-12"
                        >
                          ${preset}
                        </Button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="Custom amount"
                        value={customAmount}
                        onChange={(e) => handleCustomAmount(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>

                  {/* Fund Selection */}
                  <div>
                    <Label className="mb-3 block">Designate Fund</Label>
                    <RadioGroup value={selectedFund} onValueChange={setSelectedFund}>
                      <div className="space-y-2">
                        {fundCategories.map((fund) => (
                          <div key={fund.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:border-accent transition-colors cursor-pointer">
                            <RadioGroupItem value={fund.id} id={fund.id} />
                            <Label htmlFor={fund.id} className="flex-1 cursor-pointer">
                              <span className="font-medium block">{fund.name}</span>
                              <span className="text-sm text-muted-foreground">{fund.description}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Message */}
                  <div>
                    <Label htmlFor="message" className="mb-2 block">Add a Message (Optional)</Label>
                    <Textarea id="message" placeholder="Leave a note with your donation..." />
                  </div>

                  {/* Submit */}
                  <Button variant="hero" size="xl" className="w-full" disabled={!displayAmount}>
                    <CreditCard className="w-5 h-5" />
                    {displayAmount ? `Donate $${displayAmount}` : "Enter Amount"}
                  </Button>

                  {/* Security Note */}
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    <span>Secure payment processing</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-6">
              {/* Impact Card */}
              <Card className="gradient-card">
                <CardContent className="p-6">
                  <Heart className="w-10 h-10 text-accent mb-4" />
                  <h3 className="font-serif font-semibold text-lg mb-2">Your Impact</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Every gift, no matter the size, makes a difference in advancing God's kingdom.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">Global Reach</span>
                        <p className="text-xs text-muted-foreground">Supporting missions in 50+ countries</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <Building className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">Local Impact</span>
                        <p className="text-xs text-muted-foreground">Community programs and outreach</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-serif font-semibold mb-4">Payment Methods</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-accent" />
                      <span>Credit & Debit Cards</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-accent" />
                      <span>Bank Transfer</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-accent" />
                      <span>International Payments</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tax Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-serif font-semibold mb-2">Tax Deductible</h3>
                  <p className="text-sm text-muted-foreground">
                    All donations are tax-deductible. You will receive a receipt for your records.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Donate;
