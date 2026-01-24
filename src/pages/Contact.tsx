import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, HelpCircle, AlertCircle, Send, MapPin, Phone, Mail, Clock } from "lucide-react";

const contactTypes = [
  { id: "inquiry", label: "General Inquiry", icon: HelpCircle, description: "Questions about services, events, or membership" },
  { id: "feedback", label: "Feedback", icon: MessageCircle, description: "Share your thoughts and suggestions" },
  { id: "complaint", label: "Complaint", icon: AlertCircle, description: "Report an issue or concern" },
];

const Contact = () => {
  const { toast } = useToast();
  const [contactType, setContactType] = useState("inquiry");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    message: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent",
      description: "Thank you for contacting us. We'll respond as soon as possible.",
    });
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      address: "",
      message: "",
    });
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 gradient-hero overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-20 w-72 h-72 rounded-full bg-accent blur-3xl animate-float" />
        </div>
        <div className="container relative z-10 text-center">
          <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground mb-4">
            <MessageCircle className="w-3 h-3 mr-1" />
            Get in Touch
          </Badge>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground mb-4">
            Contact Us
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto">
            We'd love to hear from you. Send us a message, feedback, or let us know how we can help.
          </p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-12 md:py-16">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2">
              <Card className="shadow-elevated">
                <CardHeader>
                  <CardTitle className="font-serif text-2xl">Send a Message</CardTitle>
                  <CardDescription>Fill out the form below and we'll get back to you</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Contact Type */}
                    <div>
                      <Label className="mb-3 block">What is this regarding?</Label>
                      <RadioGroup value={contactType} onValueChange={setContactType} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {contactTypes.map((type) => (
                          <div key={type.id}>
                            <RadioGroupItem value={type.id} id={type.id} className="peer sr-only" />
                            <Label
                              htmlFor={type.id}
                              className="flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer hover:border-accent peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/5 transition-all"
                            >
                              <type.icon className="w-6 h-6 text-accent mb-2" />
                              <span className="font-medium text-sm">{type.label}</span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Name & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          required
                          placeholder="John Doe"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          placeholder="john@example.com"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Phone & Address */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="08037836991"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="City, Country"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <Label htmlFor="message">Your Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        placeholder="How can we help you?"
                        rows={5}
                        className="mt-1"
                      />
                    </div>

                    {/* Submit */}
                    <Button variant="hero" size="lg" className="w-full">
                      <Send className="w-5 h-5" />
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card className="gradient-card">
                <CardContent className="p-6">
                  <h3 className="font-serif font-semibold text-lg mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <span className="font-medium block">Address</span>
                        <span className="text-sm text-muted-foreground">The Miracle City Church<br/>By City Complex Asaba, Delta State</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <span className="font-medium block">Phone</span>
                        <span className="text-sm text-muted-foreground">08037836991, 09073338222</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <span className="font-medium block">Email</span>
                        <span className="text-sm text-muted-foreground">contact@homeofsuperstars.com</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-serif font-semibold">Office Hours</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monday - Friday</span>
                      <span>9:00 AM - 5:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saturday</span>
                      <span>10:00 AM - 2:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sunday</span>
                      <span>Closed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-6">
                  <h3 className="font-serif font-semibold mb-2">Need Prayer?</h3>
                  <p className="text-sm text-primary-foreground/80 mb-4">
                    Our prayer team is here to support you. Submit a prayer request anytime.
                  </p>
                  <Button variant="hero-outline" size="sm" className="w-full">
                    Submit Prayer Request
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
