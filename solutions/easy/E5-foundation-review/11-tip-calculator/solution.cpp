#include <iomanip>
#include <iostream>
int main() { double bill, tip; int party; std::cin >> bill >> tip >> party; std::cout << std::fixed << std::setprecision(2) << "Total per person: " << (bill + bill * tip / 100) / party << "\n"; }
