#include <iomanip>
#include <iostream>
int main() { double price, taxPercent; int quantity; std::cin >> price >> quantity >> taxPercent; double subtotal = price * quantity, tax = subtotal * taxPercent / 100; std::cout << std::fixed << std::setprecision(2) << "Subtotal: " << subtotal << "\nTax: " << tax << "\nTotal: " << subtotal + tax << "\n"; }
